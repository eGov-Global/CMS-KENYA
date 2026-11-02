-- ============================================================================
-- The WhatsApp chatbot's English messages, stored in localisation so they can be
-- edited without a code change. The chatbot reads rainmaker-pgr at the state
-- tenant and prefers these rows over its in-code text (dialog.get_message).
--
-- Runs with the chatbot's other migrations (xstate-chatbot-db), after
-- egov-localization's own migrations have created the message table.
--
-- Same rows as utilities/default-data-handler/.../en_IN/rainmaker-pgr-chatbot.json
-- (test/seed-matches-messages keeps that file equal to the code); regenerate this
-- list from it when the messages change, in a new migration.
--
-- TENANTS: every state tenant that already has rainmaker-pgr messages, except the
-- dump's pg seed tenant -- the chatbot's ROOT_TENANTID is one of them.
--
-- {{serviceName}} and {{portalUrl}} stay as placeholders: the chatbot fills them from
-- SERVICE_NAME / PORTAL_URL when it sends a message.
--
-- egov-localization caches messages in redis: bust its cache after this runs.
-- ============================================================================

INSERT INTO message (id, locale, code, message, tenantid, module, createdby, createddate)
SELECT gen_random_uuid()::text, 'en_IN', m.code, m.message, t.tenantid, 'rainmaker-pgr', 1, now()
FROM (VALUES
  (E'chatbot.pgr.attachment.failed', E'Sorry, it was not possible to process your attachment. Continuing without it.'),
  (E'chatbot.pgr.attachment.question', E'If possible, attach a photo or a document related to your complaint.\n\n*1.* Continue without attaching.'),
  (E'chatbot.pgr.attachment.tooLarge', E'That file is too large. Send a file smaller than {{limit}}MB.'),
  (E'chatbot.pgr.boundary.preamble', E'*{{level}}*\nSend the number of the location of your complaint: \n'),
  (E'chatbot.pgr.choice.accept', E'Accept'),
  (E'chatbot.pgr.choice.cancel', E'Cancel'),
  (E'chatbot.pgr.choice.change', E'Change'),
  (E'chatbot.pgr.choice.confidential', E'Confidential'),
  (E'chatbot.pgr.choice.confirm', E'Confirm'),
  (E'chatbot.pgr.choice.decline', E'Decline'),
  (E'chatbot.pgr.choice.notConfidential', E'Not confidential'),
  (E'chatbot.pgr.choice.submit', E'Submit'),
  (E'chatbot.pgr.complaintType.preamble', E'*{{level}}*\nSend the number of the option you want: \n'),
  (E'chatbot.pgr.confidentiality.question', E'{{label}}\n\n{{hint}}\n\n*1.* Keep my details confidential.\n*2.* Continue without confidentiality.'),
  (E'chatbot.pgr.confirmSubmission.question', E'Confirm the details:\n\n{{summary}}\n\n*1.* Submit.\n*2.* Cancel.'),
  (E'chatbot.pgr.confirmation', E'Complaint registered successfully.\n\nCategory: {{1}}\nReference: {{2}}\nDate: {{3}}\n\nYour complaint will be reviewed by the responsible institution.\nYou can follow its status on the *{{serviceName}}* portal or in the mobile app.\nThank you for helping to improve public services.\n\n{{serviceName}}\n{{portalUrl}}'),
  (E'chatbot.pgr.consent.declined', E'Your complaint has not been registered, as consent is required to process it.\n\nType *restart* whenever you would like to start again.'),
  (E'chatbot.pgr.consent.question', E'Before we register your complaint, please confirm the following:\n\n{{statements}}\n\n*1.* Accept.\n*2.* Decline'),
  (E'chatbot.pgr.description.question', E'Describe your complaint in a single message, with at least {{minLength}} characters.'),
  (E'chatbot.pgr.description.tooShort', E'That description is too short. Describe your complaint with at least {{minLength}} characters, in a single message.'),
  (E'chatbot.pgr.error.authentication', E'Sorry, we could not verify your account. Please try again in a moment.'),
  (E'chatbot.pgr.error.externalService', E'Sorry, our service is temporarily unavailable. Please try again shortly.'),
  (E'chatbot.pgr.error.generic', E'Sorry, there was an error processing your request. Please try again.'),
  (E'chatbot.pgr.error.retry', E'The option you sent does not seem to be valid.\n\nChoose a valid option to continue.'),
  (E'chatbot.pgr.error.system', E'Sorry, our system has a problem and your request cannot be completed right now. You can try again in a few minutes.'),
  (E'chatbot.pgr.error.validation', E'Sorry, we could not process your request. Please check your mobile number ({{digits}} digits) and try again.'),
  (E'chatbot.pgr.institution.question', E'Which institution is your complaint about?\n\nType and send the name of the institution.'),
  (E'chatbot.pgr.institution.tooLong', E'That name is too long. Send the institution name with at most {{maxLength}} characters.'),
  (E'chatbot.pgr.locale.question', E'To choose the language, send the number of the option you want: \n\n{{options}}'),
  (E'chatbot.pgr.menu.cancelled', E'Your session has been cancelled.'),
  (E'chatbot.pgr.menu.options', E'*Menu* \n\n*1.* File a complaint\n*2.* Cancel'),
  (E'chatbot.pgr.notAuthorized', E'Sorry, this number is not yet authorized to use this service.'),
  (E'chatbot.pgr.onboarding.name.change', E'Enter your name to continue.'),
  (E'chatbot.pgr.onboarding.name.confirm', E'Confirm the name: {{name}}?\n\n*1.* Confirm the name.\n*2.* Change the name.'),
  (E'chatbot.pgr.onboarding.name.confirmProfile', E'In our records, this number is linked to the name  *“{{name}}”*.\n\n*1.* Confirm the name.\n*2.* Change the name.'),
  (E'chatbot.pgr.onboarding.name.question', E'We did not find any name linked to this number in our records.\n\nType your name to continue:'),
  (E'chatbot.pgr.onboarding.nameInformation', E'For a personalised service, we would like to confirm your name.'),
  (E'chatbot.pgr.onboarding.thankYou', E'Thank you for the confirmation.\nIt is a pleasure to serve you.'),
  (E'chatbot.pgr.onboarding.welcome', E'Dear Citizen,\n\nWelcome to the {{serviceName}} chatbot on WhatsApp\nYou can now file your complaint through WhatsApp.\n\nTo cancel at any time, type *Cancel*.'),
  (E'chatbot.pgr.option.more', E'See more ...'),
  (E'chatbot.pgr.session.expired', E'Your previous session timed out.\n\n*1.* Resume where you left off.\n*2.* Start a new conversation.'),
  (E'chatbot.pgr.session.invalid', E'Reply *1* to resume or *2* to start over.'),
  (E'chatbot.pgr.session.resumed', E'Resuming your previous conversation. Please send your next message.'),
  (E'chatbot.pgr.submissionStalled', E'Sorry, we could not complete your request. The session has been closed — send a message to start again.'),
  (E'chatbot.pgr.summary.category', E'Category'),
  (E'chatbot.pgr.summary.confidentiality', E'Confidentiality'),
  (E'chatbot.pgr.summary.description', E'Description'),
  (E'chatbot.pgr.summary.district', E'District'),
  (E'chatbot.pgr.summary.institution', E'Institution'),
  (E'chatbot.pgr.summary.location', E'Location'),
  (E'chatbot.pgr.summary.municipality', E'Municipality'),
  (E'chatbot.pgr.summary.no', E'No'),
  (E'chatbot.pgr.summary.subject', E'Subject'),
  (E'chatbot.pgr.summary.type', E'Type'),
  (E'chatbot.pgr.summary.yes', E'Yes'),
  (E'chatbot.pgr.welcome', E'Dear {{name}},\n\nWelcome to the {{serviceName}} chatbot on WhatsApp.\nYou can now file your complaint through WhatsApp.\n\nTo cancel at any time, type *Cancel*.')
) AS m(code, message)
CROSS JOIN (
  SELECT DISTINCT tenantid
  FROM message
  WHERE module = 'rainmaker-pgr'
    AND tenantid NOT LIKE '%.%'
    AND tenantid <> 'pg'
) AS t
ON CONFLICT (tenantid, locale, module, code) DO UPDATE
SET message = EXCLUDED.message,
    lastmodifiedby = 1,
    lastmodifieddate = now();
