export type QuestionType = 'choice' | 'text';

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  subQuestion?: {
    triggerValue: string;
    question: Question;
  };
}

export type ConditionSchema = Record<string, Question[]>;

export const PresentConditionSchema: ConditionSchema = {
  'Fever': [
    { id: 'duration', label: 'How long have you had the fever?', type: 'choice', options: ['<1 Day', '1-3 Days', '>3 Days'] },
    { id: 'severity', label: 'How high does it feel?', type: 'choice', options: ['Low', 'Medium', 'High'] },
    { id: 'symptoms', label: 'Any other symptoms with it?', type: 'choice', options: ['Body ache', 'Chills', 'Sweating', 'Rash', 'None'] },
    { id: 'pattern', label: 'Does it come and go, or stay constant?', type: 'choice', options: ['Constant', 'Comes & goes'] },
    { id: 'medicine', label: 'Have you taken any medicine for it?', type: 'choice', options: ['Yes', 'No'],
      subQuestion: { triggerValue: 'Yes', question: { id: 'medicineName', label: 'What medicine?', type: 'text' } }
    }
  ],
  'Cough / Cold': [
    { id: 'type', label: 'Type of cough?', type: 'choice', options: ['Dry', 'With mucus (wet)'] },
    { id: 'duration', label: 'How long has it lasted?', type: 'choice', options: ['<3 Days', '3-7 Days', '>1 Week'] },
    { id: 'symptoms', label: 'Any of these along with it?', type: 'choice', options: ['Sore throat', 'Runny nose', 'Fever', 'Breathlessness', 'None'] },
    { id: 'pattern', label: 'Is it worse at a particular time?', type: 'choice', options: ['Morning', 'Night', 'No pattern'] },
    { id: 'wheezing', label: 'Any wheezing or difficulty breathing?', type: 'choice', options: ['Yes', 'No'] }
  ],
  'Headache': [
    { id: 'location', label: 'Where is the pain?', type: 'choice', options: ['Front', 'Back', 'One side', 'Whole head'] },
    { id: 'severity', label: 'How severe?', type: 'choice', options: ['Low', 'Medium', 'High'] },
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['Hours', '1-2 Days', 'Longer'] },
    { id: 'worse', label: 'What makes it worse?', type: 'choice', options: ['Light', 'Noise', 'Stress', 'Nothing specific'] },
    { id: 'symptoms', label: 'Any of these along with it?', type: 'choice', options: ['Nausea', 'Blurred vision', 'Dizziness', 'None'] }
  ],
  'Stomach pain': [
    { id: 'location', label: 'Where exactly?', type: 'choice', options: ['Upper', 'Lower', 'Around navel', 'All over'] },
    { id: 'duration', label: 'How long?', type: 'choice', options: ['<1 Day', '1-3 Days', '>3 Days'] },
    { id: 'severity', label: 'How severe?', type: 'choice', options: ['Low', 'Medium', 'High'] },
    { id: 'symptoms', label: 'Any of these?', type: 'choice', options: ['Vomiting', 'Diarrhea', 'Constipation', 'Bloating', 'None'] },
    { id: 'food', label: 'Related to food?', type: 'choice', options: ['Worse after eating', 'Better after eating', 'No relation'] }
  ],
  'Body pain / Injury': [
    { id: 'location', label: 'Where is the pain/injury?', type: 'choice', options: ['Head/Neck', 'Chest/Back', 'Arms/Hands', 'Legs/Feet', 'Abdomen', 'All over'] },
    { id: 'injury', label: 'Was it due to an injury/fall?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'duration', label: 'How long has it been?', type: 'choice', options: ['Today', 'Few days', 'Longer'] },
    { id: 'severity', label: 'How severe?', type: 'choice', options: ['Low', 'Medium', 'High'] },
    { id: 'swelling', label: 'Any swelling, redness, or difficulty moving?', type: 'choice', options: ['Yes', 'No'] }
  ],
  'Skin problem': [
    { id: 'location', label: 'Where is it located?', type: 'choice', options: ['Face', 'Arms', 'Legs', 'Whole body'] },
    { id: 'duration', label: 'How long has it been there?', type: 'choice', options: ['Days', 'Weeks'] },
    { id: 'feel', label: 'Is it itchy, painful, or both?', type: 'choice', options: ['Itchy', 'Painful', 'Both', 'Neither'] },
    { id: 'appearance', label: 'Any rash, redness, or swelling?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'trigger', label: 'Anything new recently?', type: 'choice', options: ['New soap/detergent', 'New food', 'New medicine', 'Nothing new'] }
  ],
  'Chest pain': [
    { id: 'location', label: 'Where exactly is the pain?', type: 'choice', options: ['Center', 'Left side', 'Right side', 'Spreads to arm/jaw'] },
    { id: 'feel', label: 'How would you describe it?', type: 'choice', options: ['Sharp', 'Dull', 'Burning', 'Tight/pressure'] },
    { id: 'worse', label: 'Does it get worse with breathing or movement?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['Just started', 'Few hours', 'Few days'] },
    { id: 'symptoms', label: 'Any of these along with it?', type: 'choice', options: ['Breathlessness', 'Sweating', 'Dizziness', 'Nausea', 'None'] }
  ],
  'Others': [
    { id: 'duration', label: 'How long have you had this?', type: 'choice', options: ['1 Day', '2 Days', '3 Days', 'More than 3 days'] },
    { id: 'severity', label: 'Severity', type: 'choice', options: ['Low', 'Medium', 'High'] },
    { id: 'allergies', label: 'Any Allergies?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'medicine', label: 'Are you taking any medicines?', type: 'choice', options: ['Yes', 'No'],
      subQuestion: { triggerValue: 'Yes', question: { id: 'medicineName', label: 'Which medicine?', type: 'text' } }
    }
  ]
};

export const PastConditionSchema: ConditionSchema = {
  'Diabetes': [
    { id: 'type', label: 'What type, if known?', type: 'choice', options: ['Type 1', 'Type 2', 'Not sure'] },
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] },
    { id: 'treatment', label: 'Are you on treatment for it?', type: 'choice', options: ['Insulin', 'Tablets', 'Diet-controlled', 'Not on treatment'] },
    { id: 'control', label: 'Is your sugar level usually controlled?', type: 'choice', options: ['Yes, controlled', 'Sometimes high', 'Often high'] },
    { id: 'check', label: 'Do you check it regularly?', type: 'choice', options: ['Yes, regularly', 'Occasionally', 'Rarely'] }
  ],
  'High BP (Hypertension)': [
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] },
    { id: 'medicine', label: 'Are you on medication for it?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'control', label: 'Is it usually controlled?', type: 'choice', options: ['Yes, controlled', 'Sometimes high', 'Often high'] },
    { id: 'check', label: 'Do you check your BP regularly?', type: 'choice', options: ['Yes', 'Occasionally', 'Rarely'] }
  ],
  'Heart Disease': [
    { id: 'type', label: 'What kind, if known?', type: 'choice', options: ['Heart attack (past)', 'Blocked artery', 'Irregular heartbeat', 'Not sure'] },
    { id: 'procedure', label: 'Have you had any procedure?', type: 'choice', options: ['Angioplasty/Stent', 'Bypass Surgery', 'None'] },
    { id: 'duration', label: 'How long ago were you diagnosed?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] },
    { id: 'medicine', label: 'Are you on heart medication currently?', type: 'choice', options: ['Yes', 'No'] }
  ],
  'Asthma / Breathing issues': [
    { id: 'frequency', label: 'How often do you get breathing trouble?', type: 'choice', options: ['Rarely', 'Sometimes', 'Often'] },
    { id: 'inhaler', label: 'Do you use an inhaler?', type: 'choice', options: ['Yes, regularly', 'Yes, only when needed', 'No'] },
    { id: 'trigger', label: 'What usually triggers it?', type: 'choice', options: ['Dust/allergy', 'Cold weather', 'Exercise', 'Not sure'] },
    { id: 'duration', label: 'How long have you had this condition?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] }
  ],
  'Thyroid problem': [
    { id: 'type', label: 'What type, if known?', type: 'choice', options: ['Hypothyroid (underactive)', 'Hyperthyroid (overactive)', 'Not sure'] },
    { id: 'medicine', label: 'Are you on medication for it?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] },
    { id: 'check', label: 'Do you get it checked regularly?', type: 'choice', options: ['Yes', 'Occasionally', 'Rarely'] }
  ],
  'Kidney disease': [
    { id: 'type', label: 'What issue, if known?', type: 'choice', options: ['Kidney stones', 'Reduced kidney function', 'Not sure'] },
    { id: 'dialysis', label: 'Are you on dialysis?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'medicine', label: 'Are you on medication for it?', type: 'choice', options: ['Yes', 'No'] },
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] }
  ],
  'Others': [
    { id: 'duration', label: 'How long have you had it?', type: 'choice', options: ['<1 Year', '1-5 Years', '>5 Years'] },
    { id: 'medicine', label: 'Are you currently on medication for it?', type: 'choice', options: ['Yes', 'No'],
      subQuestion: { triggerValue: 'Yes', question: { id: 'medicineName', label: 'Which medicine?', type: 'text' } }
    }
  ]
};

export function isFormComplete(complaint: string, answers: Record<string, string>, schema: ConditionSchema): boolean {
  if (!complaint || complaint === 'None of these') return false;
  const questions = schema[complaint];
  if (!questions) return false;

  for (const q of questions) {
    const val = answers[q.id];
    if (!val) return false;
    if (q.subQuestion && val === q.subQuestion.triggerValue) {
      if (!answers[q.subQuestion.question.id]) return false;
    }
  }
  return true;
}
