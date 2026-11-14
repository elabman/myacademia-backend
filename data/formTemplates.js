/**
 * Ready-made forms an administrator can start from ("Use template") instead of a blank form.
 * Each template builds the same structure the form builder saves:
 *   { title, description, application_type, limit_one_per_email, confirmation_message,
 *     sections: [{ title, description, questions: [{ label, help_text, question_type, is_required, options }] }] }
 */

const RWANDA_DISTRICTS = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi', 'Gisagara', 'Huye', 'Kamonyi', 'Karongi',
  'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga', 'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare',
  'Nyamagabe', 'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu', 'Ruhango', 'Rulindo', 'Rusizi',
  'Rutsiro', 'Rwamagana',
];

const q = (label, question_type, extra = {}) => ({
  label,
  question_type,
  is_required: true,
  help_text: null,
  options: null,
  ...extra,
});

const yesNo = (label, extra) => q(label, 'yes_no', extra);

const graphicDesignPackaging = () => ({
  title: 'Graphic Design for Packaging Training Programme - Application Form',
  description:
    'Apply for the Graphic Design for Packaging Training Programme (100% online) offered by Rwanda Polytechnic Kigali College.',
  application_type: 'Training application',
  limit_one_per_email: true,
  confirmation_message:
    'Thank you! Your application has been received. Submitting it does not automatically guarantee selection for the training programme. Rwanda Polytechnic Kigali College will contact you regarding your application.',
  sections: [
    {
      title: 'Section A: Personal information',
      description: null,
      questions: [
        q('Full name (as per National ID)', 'short_text'),
        q('Gender', 'multiple_choice', { options: ['Female', 'Male', 'Prefer not to say'] }),
        q('Age group', 'dropdown', { options: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55 and above'] }),
        q('Nationality', 'short_text'),
        q('District of residence', 'dropdown', { options: RWANDA_DISTRICTS }),
        q('Phone number', 'phone'),
        q('WhatsApp number', 'phone'),
        q('Email address', 'email'),
      ],
    },
    {
      title: 'Section B: Employment and business information',
      description: 'The programme specifically targets MSMEs and graphic designers.',
      questions: [
        q('Are you currently employed or self-employed?', 'multiple_choice', {
          options: ['Employed', 'Self-employed', 'Neither'],
        }),
        q('Name of your organisation/business (if applicable)', 'short_text', { is_required: false }),
        q('What is your current position or occupation?', 'short_text'),
        q('What sector does your organisation/business operate in?', 'dropdown', {
          options: [
            'Food and beverages',
            'Agriculture and agro-processing',
            'Fashion and textiles',
            'Cosmetics and beauty products',
            'Manufacturing',
            'Packaging and labelling services',
            'Graphic design and advertising',
            'Other',
          ],
        }),
        q('Is your organisation a Micro, Small or Medium Enterprise (MSME)?', 'multiple_choice', {
          options: ['Yes', 'No', 'Not sure'],
        }),
        q("What is your business's main product or service?", 'paragraph'),
        q('District where your organisation/business operates', 'dropdown', { options: RWANDA_DISTRICTS }),
      ],
    },
    {
      title: 'Section C: Previous experience and skills',
      description: null,
      questions: [
        yesNo('Do you have previous experience in graphic design?'),
        yesNo('Do you have experience in packaging or product labelling?'),
        q('Which graphic design software have you used?', 'checkboxes', {
          options: ['CorelDRAW', 'Adobe Illustrator', 'Adobe Photoshop', 'Canva', 'Other', 'None'],
        }),
        yesNo('Have you previously designed product packaging?'),
        q(
          'Briefly describe your experience in graphic design, packaging or product development.',
          'paragraph'
        ),
      ],
    },
    {
      title: 'Section D: Motivation and training expectations',
      description: null,
      questions: [
        q('Why are you interested in participating in the Graphic Design for Packaging Training Programme?', 'paragraph'),
        q('What challenges do you currently face in packaging or product labelling?', 'paragraph'),
        q('What specific skills would you like to acquire from this training?', 'paragraph'),
        q('How do you intend to apply the knowledge and skills acquired after completing the training?', 'paragraph'),
        q('Are you applying as an individual, an employee nominated by an organisation, or a business owner?', 'multiple_choice', {
          options: ['Individual', 'Employee nominated by an organisation', 'Business owner'],
        }),
      ],
    },
    {
      title: 'Section E: Online training readiness',
      description: 'This training is delivered 100% online.',
      questions: [
        yesNo('Do you have access to a computer/laptop?'),
        yesNo('Do you have reliable internet access?'),
        yesNo('Do you have access to a smartphone?'),
        yesNo('Are you able to participate in online training sessions?'),
        yesNo('Are you willing to commit to the full training programme?'),
      ],
    },
    {
      title: 'Section F: Declaration and consent',
      description: null,
      questions: [
        q(
          'I confirm that the information provided is correct and consent to the use of my information for application assessment and training administration.',
          'consent',
          {
            help_text:
              'I confirm that the information provided in this application is accurate. I understand that submitting this application does not automatically guarantee selection for the training programme. I agree to be contacted by Rwanda Polytechnic Kigali College regarding my application and any subsequent training arrangements.',
          }
        ),
      ],
    },
  ],
});

const templates = {
  'graphic-design-packaging': {
    code: 'graphic-design-packaging',
    title: 'Graphic Design for Packaging Training - application',
    description: 'Personal details, employment, experience, motivation, online readiness and consent (6 sections).',
    application_type: 'Training application',
    build: graphicDesignPackaging,
  },
};

const listTemplates = () =>
  Object.values(templates).map(({ build, ...info }) => {
    const form = build();
    return {
      ...info,
      section_count: form.sections.length,
      question_count: form.sections.reduce((total, section) => total + section.questions.length, 0),
    };
  });

const buildTemplate = (code) => (templates[code] ? templates[code].build() : null);

module.exports = { RWANDA_DISTRICTS, listTemplates, buildTemplate };
