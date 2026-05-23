# Symptom to Specialty Mapping (Non-Diagnostic)

This document helps the e-Swasthya assistant route user-reported symptoms to an appropriate medical specialty.
It is not a diagnosis guide and must not be used to name a disease, prescribe treatment, or interpret reports.

The assistant should:

- Recommend a specialty or first point of care.
- Suggest booking a consultation on e-Swasthya when appropriate.
- Give emergency guidance for red-flag symptoms.
- Prefer General Medicine or Internal Medicine when symptoms are vague, multi-system, early, or unclear.
- Avoid certainty. Use phrasing like "it would be best to consult..." or "a good first step is..."

Available platform specialties in the seeded doctor data include:

- Cardiology
- Dermatology
- Endocrinology
- ENT
- Gastroenterology
- General Medicine
- General Surgery
- Internal Medicine
- Neurology
- Ophthalmology
- Orthopedics
- Pediatrics
- Pulmonology

If a symptom points to a specialty not currently available in the platform doctor list, recommend General Medicine or Internal Medicine first, and mention that the user may need referral to a specific specialist.

---

## Emergency And Red-Flag Rules

If the user mentions any of the following, advise immediate emergency medical care instead of normal booking flow:

- Chest pain or chest pressure that is severe, crushing, sudden, persistent, or associated with sweating, nausea, dizziness, fainting, pain spreading to arm/jaw/back, or shortness of breath.
- Severe difficulty breathing, gasping, blue lips, or inability to speak full sentences.
- Sudden weakness, facial droop, confusion, trouble speaking, sudden vision loss, or new one-sided numbness.
- Loss of consciousness, seizure, severe head injury, or repeated fainting.
- Uncontrolled bleeding, severe burn, poisoning, or major accident.
- Severe allergic reaction with swelling of lips/tongue/throat, wheezing, or breathing trouble.
- Severe abdominal pain with fainting, rigid abdomen, blood vomiting, black stool, or pregnancy-related severe pain/bleeding.
- High fever with confusion, stiff neck, seizure, severe dehydration, or fever in an infant.
- Suicidal thoughts, self-harm thoughts, or intent to harm someone else.

Emergency response format:

"This could be urgent. Please seek immediate medical care or call local emergency services now. I can help with general platform guidance after you are safe."

Do not continue with normal doctor search unless the user clarifies the symptom is mild/non-urgent.

---

## Clarifying Questions

Ask only one or two clarifying questions if needed. Do not turn the chatbot into a long triage interview.

Useful questions:

- Is this for an adult, child, elderly person, or pregnancy-related concern?
- How long has it been happening?
- Is it mild, moderate, or severe?
- Did it start suddenly?
- Are there red flags like breathing difficulty, fainting, confusion, heavy bleeding, or severe pain?

If the symptom is clear enough, map directly to a specialty.

---

## Cardiovascular Symptoms

Common phrases:

- chest pain
- chest pains
- chest pressure
- chest tightness
- chest discomfort
- palpitations
- fast heartbeat
- irregular heartbeat
- high blood pressure
- swelling in legs with breathlessness
- dizziness with heart racing

Recommended specialty:

- Cardiology

First point of care:

- Cardiology if the user asks for a heart/chest-related specialist.
- General Medicine or Internal Medicine if symptoms are vague or mild and not clearly cardiac.

Emergency warning:

- Chest pain with shortness of breath, sweating, nausea, fainting, crushing pressure, or pain spreading to arm/jaw/back needs immediate medical care.

Example:

"For chest pain or palpitations, a Cardiology specialist is usually appropriate. If the chest pain is severe, persistent, or comes with sweating, dizziness, nausea, or shortness of breath, please seek emergency care immediately."

---

## Respiratory And Lung Symptoms

Common phrases:

- cough
- chronic cough
- wheezing
- asthma symptoms
- chest congestion
- breathing difficulty
- shortness of breath
- noisy breathing
- coughing up phlegm

Recommended specialty:

- Pulmonology

First point of care:

- Pulmonology for ongoing breathing, asthma-like, or chronic cough concerns.
- General Medicine for mild cough, cold-like symptoms, or unclear early symptoms.

Emergency warning:

- Severe shortness of breath, blue lips, chest pain with breathlessness, or inability to speak normally needs urgent care.

---

## Fever And Infection-Like Symptoms

Common phrases:

- fever
- chills
- body ache
- fatigue
- sore throat
- mild cough
- weakness
- flu-like symptoms
- feeling unwell

Recommended specialty:

- General Medicine
- Internal Medicine

First point of care:

- General Medicine for most adult fever or general illness.
- Pediatrics for children.

Emergency warning:

- High fever with confusion, stiff neck, seizure, severe dehydration, breathing difficulty, or fever in a very young infant needs urgent care.

---

## ENT Symptoms

Common phrases:

- ear pain
- blocked ear
- hearing loss
- ringing in ear
- sore throat
- tonsil pain
- sinus pain
- nasal blockage
- nose bleeding
- hoarse voice
- vertigo related to ear

Recommended specialty:

- ENT

First point of care:

- ENT for ear, nose, throat, sinus, tonsil, voice, and hearing concerns.
- General Medicine for mild sore throat, mild cold, or unclear symptoms.

Emergency warning:

- Severe throat swelling, breathing difficulty, uncontrolled nose bleeding, or sudden severe dizziness with neurological symptoms needs urgent care.

---

## Gastrointestinal And Digestive Symptoms

Common phrases:

- stomach pain
- abdominal pain
- acidity
- heartburn
- reflux
- bloating
- nausea
- vomiting
- constipation
- diarrhea
- loss of appetite
- blood in stool
- black stool
- difficulty swallowing

Recommended specialty:

- Gastroenterology

First point of care:

- Gastroenterology for persistent digestive, acidity, bowel, liver-like, or stomach concerns.
- General Medicine for mild or short-duration symptoms.

Emergency warning:

- Severe abdominal pain, persistent vomiting, blood vomiting, black stool, fainting, severe dehydration, or pregnancy-related severe abdominal pain needs urgent care.

---

## Neurological Symptoms

Common phrases:

- headache
- frequent headaches
- migraine
- dizziness
- vertigo
- numbness
- tingling
- weakness
- tremor
- seizure
- memory problems
- balance problems
- fainting

Recommended specialty:

- Neurology

First point of care:

- Neurology for recurring headaches, seizures, numbness, tremors, balance issues, or nerve-related symptoms.
- General Medicine for mild one-time dizziness or unclear symptoms.

Emergency warning:

- Sudden weakness, facial droop, confusion, trouble speaking, severe sudden headache, seizure, fainting, or sudden vision change needs immediate medical care.

---

## Skin, Hair, And Nail Symptoms

Common phrases:

- skin rash
- itching
- acne
- eczema
- psoriasis
- fungal infection
- hives
- skin allergy
- hair loss
- dandruff
- nail changes
- mole changes
- pigmentation

Recommended specialty:

- Dermatology

First point of care:

- Dermatology for skin, hair, nail, allergy-like skin, acne, rash, and chronic itching concerns.
- General Medicine if rash is accompanied by fever or general illness.

Emergency warning:

- Rash with breathing difficulty, swelling of lips/tongue/throat, or widespread blistering needs urgent care.

---

## Bone, Joint, Muscle, And Injury Symptoms

Common phrases:

- joint pain
- back pain
- neck pain
- knee pain
- shoulder pain
- hip pain
- muscle pain
- stiffness
- fracture
- sprain
- sports injury
- difficulty walking
- swelling after injury

Recommended specialty:

- Orthopedics

First point of care:

- Orthopedics for bone, joint, muscle, spine, fracture, injury, and mobility concerns.
- General Medicine for mild body aches with fever or general illness.

Emergency warning:

- Major injury, visible deformity, inability to move a limb after trauma, severe swelling, or loss of sensation needs urgent care.

---

## Child Health Symptoms

Common phrases:

- child fever
- baby fever
- poor feeding
- vomiting in child
- diarrhea in child
- growth concern
- vaccination question
- child cough
- frequent infections

Recommended specialty:

- Pediatrics

First point of care:

- Pediatrics for babies, children, and adolescents.

Emergency warning:

- Fever in a very young infant, breathing difficulty, severe dehydration, seizure, unusual drowsiness, or blue lips needs urgent care.

---

## Eye Symptoms

Common phrases:

- eye pain
- red eye
- blurry vision
- vision loss
- watery eyes
- eye strain
- light sensitivity
- double vision
- eye injury

Recommended specialty:

- Ophthalmology

First point of care:

- Ophthalmology for eye pain, redness, vision, injury, and light sensitivity concerns.

Emergency warning:

- Sudden vision loss, eye injury, severe eye pain, chemical exposure, or new neurological symptoms with vision change needs urgent care.

---

## Hormone, Diabetes, And Thyroid-Like Symptoms

Common phrases:

- diabetes
- high blood sugar
- low blood sugar
- thyroid
- weight gain
- weight loss
- excessive thirst
- frequent urination
- heat intolerance
- cold intolerance
- hormonal imbalance

Recommended specialty:

- Endocrinology

First point of care:

- Endocrinology for diabetes, thyroid, hormonal, and metabolic concerns.
- General Medicine or Internal Medicine for first evaluation if the user is unsure.

Emergency warning:

- Confusion, fainting, severe dehydration, very low blood sugar symptoms, or severe weakness needs urgent care.

---

## Mental Health And Emotional Well-Being

Common phrases:

- anxiety
- stress
- panic attacks
- mood swings
- sadness
- depression
- sleep problems
- lack of motivation
- suicidal thoughts
- self harm

Recommended specialty:

- Psychiatry

First point of care:

- Psychiatry for anxiety, mood, panic, sleep, and emotional health concerns.
- General Medicine can also be a first step if the user is unsure.

Emergency warning:

- Suicidal thoughts, self-harm thoughts, or intent to harm someone else needs immediate crisis support or emergency care.

---

## General Surgery Symptoms

Common phrases:

- lump
- swelling
- hernia
- gallbladder
- appendix concern
- wound
- abscess
- boil
- surgical consultation

Recommended specialty:

- General Surgery

First point of care:

- General Surgery for surgical evaluation, lumps, hernia-like concerns, abscesses, wounds, and procedure-related questions.
- General Medicine first if the user is unsure or symptoms are mild.

Emergency warning:

- Severe abdominal pain, infected wound with high fever, rapidly spreading swelling, or uncontrolled bleeding needs urgent care.

---

## Internal Medicine Symptoms

Common phrases:

- multiple symptoms
- chronic illness
- diabetes and blood pressure together
- weakness
- fatigue
- unexplained weight change
- elderly patient
- complex medical history
- follow-up for long-term condition

Recommended specialty:

- Internal Medicine

First point of care:

- Internal Medicine for adult patients with complex, chronic, or multi-system symptoms.
- General Medicine is also acceptable as a first point of care.

---

## General Medicine Default

Use General Medicine when:

- The symptoms are vague.
- The user is unsure what kind of doctor to see.
- Multiple body systems are involved.
- The complaint is mild, early, or first-time.
- The mapped specialty is not available in the platform doctor list.

Example:

"Since the symptoms are broad, a General Medicine doctor would be a good first step. They can evaluate you and refer you to a specialist if needed."

---

## Output Rules For Assistant

For normal mapping:

1. Mention the recommended specialty.
2. Briefly explain that this is routing guidance, not a diagnosis.
3. Offer to find doctors or check availability.

Example:

"Based on those symptoms, a Pulmonology specialist would be appropriate for breathing or asthma-like concerns. This is not a diagnosis, but I can help you find pulmonologists on e-Swasthya."

For emergency mapping:

1. Tell the user to seek immediate medical care.
2. Do not suggest routine appointment booking first.
3. Keep the message short and clear.

Example:

"Chest pain with shortness of breath or sweating can be urgent. Please seek immediate medical care now. After you are safe, I can help with e-Swasthya appointment options."

---

## Reference Basis

This routing document is based on general patient-safety principles and public health-topic structures such as MedlinePlus symptom/health-topic pages and emergency warning guidance. It is adapted for e-Swasthya's available specialties and is intentionally non-diagnostic.
