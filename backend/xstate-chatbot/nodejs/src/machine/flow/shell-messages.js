// Every citizen-facing string in the onboarding journey and the shell.
//
// `code` is a localisation key looked up live at send time; the locale entries
// below are the fallback used when the platform has no translation. Codes are
// external contracts — they exist nowhere else in this repo, so changing one
// silently stops translations resolving.
//
// Copy for the unreachable organization-code flow lives with that flow, in
// flow/legacy-organization.js.

module.exports = {
  onboarding: {
    localeMenu: {
      code: 'chatbot.pgr.locale.question',
      en_IN: "To choose the language, send the number of the option you want: \n\n{{options}}",
      pt_PT: "Para escolher o idioma, envie o número da opção pretendida: \n\n{{options}}",
    },
    onboardingWelcome: {
      code: 'chatbot.pgr.onboarding.welcome',
      en_IN:
        "Dear Citizen,\n\nWelcome to the {{serviceName}} chatbot on WhatsApp\nYou can now file your complaint through WhatsApp.\n\nTo cancel at any time, type *Cancel*.",
      pt_PT:
        "Estimado(a) Cidadão(ã),\n\nBem-vindo(a) ao chatbot do {{serviceName}} no WhatsApp\nJá pode apresentar a sua manifestação através do WhatsApp.\n\nPara cancelar em qualquer momento, escreva *Cancelar*.",
    },
    onboardingName: {
      question: {
        code: 'chatbot.pgr.onboarding.name.question',
        en_IN:
          "We did not find any name linked to this number in our records.\n\nType your name to continue:",
        pt_PT:
          "Nos nossos registos não encontrámos nenhum nome associado a este número.\n\nEscreva o seu nome para continuar:",
      },
    },
    onBoardingUserProfileConfirmation: {
      question: {
        code: 'chatbot.pgr.onboarding.name.confirmProfile',
        en_IN:
          "In our records, this number is linked to the name  *“{{name}}”*.\n\n*1.* Confirm the name.\n*2.* Change the name.",
        pt_PT:
          "Nos nossos registos, este número está associado ao nome  *“{{name}}”*.\n\n*1.* Confirmar o nome.\n*2.* Alterar o nome.",
      },
    },
    changeName: {
      question: {
        code: 'chatbot.pgr.onboarding.name.change',
        en_IN: "Enter your name to continue.",
        pt_PT: "Indique o seu nome para continuar.",
      },
    },
    onboardingNameConfirmation: {
      code: 'chatbot.pgr.onboarding.name.confirm',
      en_IN:
        "Confirm the name: {{name}}?\n\n*1.* Confirm the name.\n*2.* Change the name.",
      pt_PT:
        "Confirmar o nome: {{name}}?\n\n*1.* Confirmar o nome.\n*2.* Alterar o nome.",
    },
    onboardingThankYou: {
      code: 'chatbot.pgr.onboarding.thankYou',
      en_IN:
        "Thank you for the confirmation.\nIt is a pleasure to serve you.",
      pt_PT:
        "Obrigado pela confirmação.\nÉ um prazer servi-lo(a).",
    },
    nameInformation: {
      code: 'chatbot.pgr.onboarding.nameInformation',
      en_IN:
        "For a personalised service, we would like to confirm your name.",
      pt_PT:
        "Para um atendimento personalizado, gostaríamos de confirmar o seu nome.",
    },
  },
    welcome: {
    code: 'chatbot.pgr.welcome',
    en_IN:
      "Dear {{name}},\n\nWelcome to the {{serviceName}} chatbot on WhatsApp.\nYou can now file your complaint through WhatsApp.\n\nTo cancel at any time, type *Cancel*.",
    pt_PT:
      "Estimado(a) {{name}},\n\nBem-vindo(a) ao chatbot {{serviceName}} no WhatsApp.\nJá pode apresentar a sua manifestação através do WhatsApp.\n\nPara cancelar em qualquer momento, escreva *Cancelar*.",
  },
  sessionExpired: {
    question: {
      code: 'chatbot.pgr.session.expired',
      en_IN: 'Your previous session timed out.\n\n*1.* Resume where you left off.\n*2.* Start a new conversation.',
      pt_PT: 'A sua sessão anterior expirou.\n\n*1.* Continuar de onde terminou.\n*2.* Iniciar uma nova conversa.'
    },
    resumed: {
      code: 'chatbot.pgr.session.resumed',
      en_IN: 'Resuming your previous conversation. Please send your next message.',
      pt_PT: 'A continuar a sua conversa anterior. Envie a sua próxima mensagem.'
    },
    invalid: {
      code: 'chatbot.pgr.session.invalid',
      en_IN: 'Reply *1* to resume or *2* to start over.',
      pt_PT: 'Responda *1* para continuar ou *2* para começar de novo.'
    }
  },
    notAuthorized: {
    code: 'chatbot.pgr.notAuthorized',
    en_IN: "Sorry, this number is not yet authorized to use this service.",
    pt_PT: "Lamentamos, este número ainda não está autorizado a utilizar este serviço.",
  },
  // The words Yes/No prompts actually print. Each QuestionState pairs two of
  // these so matchReply recognises the choice the citizen was shown.
  choices: {
    accept: { code: 'chatbot.pgr.choice.accept', en_IN: 'Accept', pt_PT: 'Aceitar' },
    decline: { code: 'chatbot.pgr.choice.decline', en_IN: 'Decline', pt_PT: 'Rejeitar' },
    submit: { code: 'chatbot.pgr.choice.submit', en_IN: 'Submit', pt_PT: 'Submeter' },
    cancel: { code: 'chatbot.pgr.choice.cancel', en_IN: 'Cancel', pt_PT: 'Cancelar' },
    confirm: { code: 'chatbot.pgr.choice.confirm', en_IN: 'Confirm', pt_PT: 'Confirmar' },
    change: { code: 'chatbot.pgr.choice.change', en_IN: 'Change', pt_PT: 'Alterar' },
    confidential: { code: 'chatbot.pgr.choice.confidential', en_IN: 'Confidential', pt_PT: 'Confidencial' },
    notConfidential: { code: 'chatbot.pgr.choice.notConfidential', en_IN: 'Not confidential', pt_PT: 'Sem confidencialidade' },
  },
  // Sent by error-handler.js when a turn fails. {{digits}} is filled from
  // config.mobileNumberLength; it used to read "10 digits" on every deployment.
  errors: {
    generic: {
      code: 'chatbot.pgr.error.generic',
      en_IN: 'Sorry, there was an error processing your request. Please try again.',
      pt_PT: 'Lamentamos, ocorreu um erro ao processar o seu pedido. Tente novamente.',
    },
    validation: {
      code: 'chatbot.pgr.error.validation',
      en_IN: 'Sorry, we could not process your request. Please check your mobile number ({{digits}} digits) and try again.',
      pt_PT: 'Lamentamos, não foi possível processar o seu pedido. Verifique o seu número de telemóvel ({{digits}} dígitos) e tente novamente.',
    },
    authentication: {
      code: 'chatbot.pgr.error.authentication',
      en_IN: 'Sorry, we could not verify your account. Please try again in a moment.',
      pt_PT: 'Lamentamos, não foi possível verificar a sua conta. Tente novamente dentro de momentos.',
    },
    externalService: {
      code: 'chatbot.pgr.error.externalService',
      en_IN: 'Sorry, our service is temporarily unavailable. Please try again shortly.',
      pt_PT: 'Lamentamos, o serviço está temporariamente indisponível. Tente novamente em breve.',
    },
  },
  submissionStalled: {
    code: 'chatbot.pgr.submissionStalled',
    en_IN: 'Sorry, we could not complete your request. The session has been closed — send a message to start again.',
    pt_PT: 'Lamentamos, não foi possível concluir o seu pedido. A sessão foi terminada — envie uma mensagem para recomeçar.',
  },
};
