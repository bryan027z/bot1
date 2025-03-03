const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
// Usamos el adaptador JSON para persistir la sesión
const JSONAdapter = require('@bot-whatsapp/database/json');
const path = require("path");
const fs = require("fs");

// Cargar el menú desde un archivo
const menuPath = path.join(__dirname, "mensajes", "menu.txt");
const menu = fs.readFileSync(menuPath, "utf8");

// Lista de agentes con sus datos de contacto
const agents = {
    billing: { name: "Juan Pablo Rivas", id: "AGENT_1", phone: "+50660468116" },
    architecture: { name: "Jose Pablo Flores", id: "AGENT_2", phone: "+50688011741" },
    projectManagement: { name: "Leo Ortiz", id: "AGENT_3", phone: "+50687796407" },
};

// Mapeo de proyectos
const projects = {
    '1': 'Paraiso Delfines',
    '2': 'Luz de Mar',
    '3': 'Azul del Mar'
};

// Función para notificar al agente usando el formato correcto de Baileys
async function notifyAgent(provider, agentPhone, customerInfo) {
    try {
        const message = `¡Nuevo cliente!\n` +
                        `Nombre: ${customerInfo.name}\n` +
                        `Proyecto: ${customerInfo.project}\n` +
                        `Servicio: ${customerInfo.service}\n` +
                        `WhatsApp: ${customerInfo.phone}`;
        await provider.getInstance().sendMessage(agentPhone, { text: message });
        console.log('Notification sent to agent:', agentPhone);
    } catch (error) {
        console.error('Error sending notification to agent:', error);
    }
}

// Función para mostrar contactos según la selección de servicio
const showContacts = (option, projectName) => {
    const serviceNames = {
        '1': 'Billing',
        '2': 'Architecture',
        '3': 'Project Management'
    };

    const agentDetails = {
        '1': {
            name: agents.billing.name,
            phone: agents.billing.phone,
            email: 'billing@terrameridiamcr.com',
            service: serviceNames['1']
        },
        '2': {
            name: agents.architecture.name,
            phone: agents.architecture.phone,
            email: 'architecture@terrameridiamcr.com',
            service: serviceNames['2']
        },
        '3': {
            name: agents.projectManagement.name,
            phone: agents.projectManagement.phone,
            email: 'projectmanagement@terrameridiamcr.com',
            service: serviceNames['3']
        },
    };

    if (!agentDetails[option]) {
        return {
            messages: ['Invalid option selected. Please try again.'],
            agentDetails: null
        };
    }

    const details = agentDetails[option];
    return {
        messages: [
            `Hello! My name is ${details.name}. I'll assist you with your inquiry.`,
            `You can contact me directly:`,
            `WhatsApp: https://wa.me/${details.phone.replace("+", "")}`,
            `Email: ${details.email}`,
            `Thank you for contacting us. Have a great day! 👋\n\nIf you need to start over, type "menu".`
        ],
        agentDetails: { ...details, project: projectName }
    };
};

// Flujo de bienvenida que conduce a la selección de servicio
const flowWelcome = addKeyword(EVENTS.WELCOME)
    .addAnswer('Hello! Thank you for reaching out to Terrameridiam. We are a benchmark in architectural innovation and design excellence.')
    .addAnswer(
        'Please select the project you are inquiring about:\n1- Paraiso Delfines\n2- Luz de Mar\n3- Azul del Mar',
        { capture: true },
        async (ctx, { fallBack, flowDynamic, state }) => {
            const projectOption = ctx.body;
            if (!['1', '2', '3'].includes(projectOption)) {
                return fallBack('Invalid answer, please select one of the options: 1, 2, or 3.');
            }
            // Guardar la selección del proyecto en el estado
            await state.update({ projectName: projects[projectOption] });
            await flowDynamic('Please select the area of assistance:\n1- Billing\n2- Architecture\n3- Project Management');
        }
    )
    .addAnswer(
        ['Which service would you like to inquire about?'],
        { capture: true },
        async (ctx, { fallBack, flowDynamic, state, provider }) => {
            const option = ctx.body;
            if (!['1', '2', '3'].includes(option)) {
                return fallBack('Invalid answer, please select 1, 2, or 3.');
            }
            const projectName = state.get('projectName');
            const response = showContacts(option, projectName);
            if (response.agentDetails) {
                // Preparar la información del cliente para notificar al agente
                const customerInfo = {
                    name: ctx.pushName || 'Cliente',
                    phone: ctx.from,
                    project: projectName,
                    service: response.agentDetails.service
                };
                // Formatear el número del agente para Baileys
                const formattedAgentPhone = `${response.agentDetails.phone.replace('+', '')}@s.whatsapp.net`;
                // Notificar al agente
                await notifyAgent(provider, formattedAgentPhone, customerInfo);
            }
            // Enviar mensajes al cliente
            for (const message of response.messages) {
                await flowDynamic(message);
            }
        }
    );

// Flujo del menú principal (para usuarios que regresan)
const flowMainMenu = addKeyword(['menu', 'MENU', 'Menu'])
    .addAnswer(
        'Please select the project you are inquiring about:\n1- Paraiso Delfines\n2- Luz de Mar\n3- Azul del Mar',
        { capture: true },
        async (ctx, { fallBack, flowDynamic, state }) => {
            const projectOption = ctx.body;
            if (!['1', '2', '3'].includes(projectOption)) {
                return fallBack('Invalid option. Please select 1, 2, or 3.');
            }
            // Guardar la selección del proyecto en el estado
            await state.update({ projectName: projects[projectOption] });
            await flowDynamic('Please select the area of assistance:\n1- Billing\n2- Architecture\n3- Project Management');
        }
    )
    .addAnswer(
        ['Which service would you like to inquire about?'],
        { capture: true },
        async (ctx, { fallBack, flowDynamic, state, provider }) => {
            const option = ctx.body;
            if (!['1', '2', '3'].includes(option)) {
                return fallBack('Invalid option. Please select 1, 2, or 3.');
            }
            const projectName = state.get('projectName');
            const response = showContacts(option, projectName);
            if (response.agentDetails) {
                // Preparar la información del cliente para notificar al agente
                const customerInfo = {
                    name: ctx.pushName || 'Cliente',
                    phone: ctx.from,
                    project: projectName,
                    service: response.agentDetails.service
                };
                // Formatear el número del agente para Baileys
                const formattedAgentPhone = `${response.agentDetails.phone.replace('+', '')}@s.whatsapp.net`;
                // Notificar al agente
                await notifyAgent(provider, formattedAgentPhone, customerInfo);
            }
            // Enviar mensajes al cliente
            for (const message of response.messages) {
                await flowDynamic(message);
            }
        }
    );

// Configuración principal del bot
const main = async () => {
    // Utilizamos el adaptador JSON para persistir la sesión en "session.json"
    const adapterDB = new JSONAdapter({ session: 'session.json' });
    const adapterFlow = createFlow([flowWelcome, flowMainMenu]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();