/* ============================================================
   api(action, data) → Promise<result>
   - Real mode : Firebase Auth + Firestore. Documents are stored
     inside Firestore as base64 chunks (no billing card needed).
     Contact form additionally goes to Formspree → email inbox.
   - Mock mode : simulates the whole backend in localStorage
     so the site can be tested before any deployment.
   Every result resolves with { ok:true, ... } or rejects with
   an Error whose message is user-friendly.
   ============================================================ */

var ERROR_TEXT = {
  INVALID_EMAIL:   "Please enter a valid email address.",
  WEAK_PASSWORD:   "Password must be at least 6 characters.",
  NAME_REQUIRED:   "Please enter your full name.",
  EMAIL_EXISTS:    "An account with this email already exists. Try logging in.",
  BAD_CREDENTIALS: "Wrong email or password.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  FORBIDDEN:       "You don't have permission to do that.",
  LOCKED:          "Your application is already being processed and can no longer be edited.",
  PROGRAM_REQUIRED:"Please choose a program.",
  FILE_TOO_LARGE:  "This file is larger than 10 MB. Please upload a smaller file.",
  NO_FILE:         "No file was selected.",
  NOT_FOUND:       "Item not found.",
  MISSING_FIELDS:  "Please fill in all required fields.",
  SERVER_ERROR:    "The server had a problem. Please try again in a moment."
};

var CB_STATUSES = [
  "Pending Review",
  "Under Review",
  "Document Requested",
  "Document Received",
  "Document Evaluated",
  "Legalization",
  "Super Legalization",
  "Nostrification",
  "University Selected",
  "Program Selected",
  "Applied to Universities",
  "Waiting for Entrance Exam",
  "Conditional Admission Letter Received",
  "Tuition Fees Paid",
  "Main Offer Letter Received",
  "Prepared Documents for Visa",
  "Appointment Scheduled",
  "Interview Preparation",
  "Visa Processing",
  "Accepted",
  "Rejected",
  "Dropped"
];

// Comprehensive 20-Step European University Admission Journey (Czech Republic Focus)
var ADMISSION_20_STEPS = [
  { step: 1, id: "consultation", title: "Initial Consultation & Profile Assessment", category: "Phase 1: Consultation", desc: "Review academic background, language skills, degree goals, and budget." },
  { step: 2, id: "matching", title: "Program Selection & University Matching", category: "Phase 1: Selection", desc: "Match top 3 European universities & degree programs in Czechia." },
  { step: 3, id: "doc_upload", title: "Initial Document Upload", category: "Phase 1: Documents", desc: "Upload passport scan, SSC/HSC marksheets, bachelor degree, and photo." },
  { step: 4, id: "translation", title: "Sworn Czech Translation", category: "Phase 1: Legalization", desc: "Translate educational certificates into Czech language by certified sworn translator." },
  { step: 5, id: "apostille", title: "E-Apostille / Legalization", category: "Phase 1: Legalization", desc: "Obtain Apostille or E-Apostille stamp from Ministry of Foreign Affairs." },
  { step: 6, id: "superlegalization", title: "Embassy Superlegalization", category: "Phase 1: Legalization", desc: "Authenticate documents at Czech Embassy / Ministry of Foreign Affairs." },
  { step: 7, id: "verification", title: "Document Verification", category: "Phase 2: Verification", desc: "Brno team audits and verifies document authenticity and formatting." },
  { step: 8, id: "doc_requested", title: "Supplementary Documents Check", category: "Phase 2: Verification", desc: "Verify CV, motivation letter, and English proof (IELTS/Duolingo/MOI)." },
  { step: 9, id: "nostrif_app", title: "Nostrification Application", category: "Phase 2: Recognition", desc: "Submit formal application for educational degree recognition in Czechia." },
  { step: 10, id: "nostrif_exam", title: "Nostrification Exam / Approval", category: "Phase 2: Recognition", desc: "Complete nostrification exam (if required) and receive Equivalence Certificate." },
  { step: 11, id: "exam_prep", title: "Entrance Exam & Interview Prep", category: "Phase 3: Examination", desc: "Access study guides, mock questions, and online interview training." },
  { step: 12, id: "entrance_exam", title: "Entrance Exam / Online Interview", category: "Phase 3: Examination", desc: "Take university entrance exam or participate in online faculty interview." },
  { step: 13, id: "conditional_offer", title: "Conditional Admission Offer", category: "Phase 3: Offer", desc: "Receive official Conditional Offer Letter from the university faculty." },
  { step: 14, id: "tuition_fee", title: "Tuition Fee Payment", category: "Phase 3: Offer", desc: "Pay first semester tuition fee directly to the official university bank account." },
  { step: 15, id: "final_admission", title: "Final Admission Decision Letter", category: "Phase 3: Offer", desc: "Receive original stamped Decision on Admission & official university contract." },
  { step: 16, id: "accommodation", title: "Proof of Accommodation Contract", category: "Phase 4: Visa Prep", desc: "Secure certified dormitory accommodation or rental contract in Czechia." },
  { step: 17, id: "visa_appointment", title: "Visa Appointment Scheduling", category: "Phase 4: Visa", desc: "Schedule long-term study visa appointment slot at Czech Embassy / Consulate." },
  { step: 18, id: "visa_submission", title: "Visa File Submission & Interview", category: "Phase 4: Visa", desc: "Submit long-term visa application packet & attend embassy interview." },
  { step: 19, id: "visa_approved", title: "Visa Approved & Stamped", category: "Phase 4: Visa", desc: "Receive visa approval notification and get D-Visa stamp in your passport!" },
  { step: 20, id: "arrival_enrollment", title: "Arrival in Brno & University Matriculation", category: "Phase 5: Arrival", desc: "Flight booking, airport greeting in Brno/Prague, and official university enrollment!" }
];

// 🇲🇾 Malaysia Work Permit & Employment Visa Journey
var MALAYSIA_WORK_STEPS = [
  { step: 1, id: "my_consult", title: "Profile Screening & Job Matching", category: "Phase 1: Application", desc: "Verify candidate CV, qualifications, trade skills, and passport validity (min 18 months)." },
  { step: 2, id: "my_quota", title: "Employer Quota & ESD Approval", category: "Phase 1: Quota", desc: "Sponsoring Malaysian company secures Expatriate Services Division (ESD) / KDN approval." },
  { step: 3, id: "my_vdr_app", title: "Calling Visa (VDR) Submission", category: "Phase 2: Clearance", desc: "Submit candidate application to Malaysian Immigration Department for Visa With Reference (VDR)." },
  { step: 4, id: "my_vdr_issue", title: "VDR Approval & Calling Visa Issuance", category: "Phase 2: Clearance", desc: "Official Immigration approval letter & VDR clearance issued." },
  { step: 5, id: "my_sev", title: "Single Entry Visa (SEV) Stamping", category: "Phase 3: Embassy", desc: "Submit passport to Malaysian High Commission / Embassy for Single Entry Visa (SEV)." },
  { step: 6, id: "my_arrival", title: "Flight to Kuala Lumpur & KLIA Clearance", category: "Phase 3: Arrival", desc: "Book flight ticket, receive airport pickup in KL, and complete immigration clearance." },
  { step: 7, id: "my_fomema", title: "FOMEMA Medical Screening", category: "Phase 4: Medical", desc: "Undergo mandatory FOMEMA medical check-up in Malaysia within 7 days of arrival." },
  { step: 8, id: "my_ikad", title: "Passport Endorsement & i-Kad Issuance", category: "Phase 4: Work Permit", desc: "Immigration stamps Employment Pass / Work Permit sticker on passport and issues i-Kad!" }
];

// 🇷🇸 Serbia Work Permit & Employment Visa Journey
var SERBIA_WORK_STEPS = [
  { step: 1, id: "rs_consult", title: "Candidate Evaluation & Job Offer", category: "Phase 1: Application", desc: "Match applicant skills with Serbian employer vacancies in construction, logistics, hospitality, or IT." },
  { step: 2, id: "rs_nes_test", title: "National Employment Service (NES) Labour Test", category: "Phase 1: Market Test", desc: "Serbian employer conducts mandatory 10-day labour market test with National Employment Service (NES)." },
  { step: 3, id: "rs_work_approval", title: "NES Work Permit Pre-Approval", category: "Phase 2: Work Permit", desc: "National Employment Service issues official Work Permit approval for non-EU candidate." },
  { step: 4, id: "rs_visa_file", title: "Type D Long-Stay Employment Visa File", category: "Phase 2: Visa Prep", desc: "Assemble police clearance certificate, health insurance, guarantee letter, and housing proof." },
  { step: 5, id: "rs_embassy", title: "Embassy Appointment & Visa Stamping", category: "Phase 3: Embassy", desc: "Attend Serbian Embassy appointment, submit original file, and receive Type D Visa stamp." },
  { step: 6, id: "rs_arrival", title: "Travel to Belgrade & White Card Registration", category: "Phase 3: Arrival", desc: "Fly to Belgrade Airport, receive transfer, and register white card (Beli Karton) with local police within 24h." },
  { step: 7, id: "rs_residence", title: "Temporary Residence & Final Work License", category: "Phase 4: Permit", desc: "Submit biometrics to Ministry of Interior (MUP) for Single Work & Residence Permit Card." },
  { step: 8, id: "rs_onboarding", title: "Tax Registration & Employment Start", category: "Phase 4: Onboarding", desc: "Receive tax identification number (PIB), sign formal employment contract, and begin work!" }
];

// 🇵🇱 Poland Study & Work Permit Track
var POLAND_STEPS = [
  { step: 1, id: "pl_consult", title: "Profile Evaluation & Degree Matching", category: "Phase 1: Eligibility", desc: "Assess high school / university transcripts for Polish university or work permit eligibility." },
  { step: 2, id: "pl_application", title: "University Application / Work Clearance", category: "Phase 1: Application", desc: "Submit file to Polish university (e.g. Warsaw, Wroclaw) or Polish Voivodeship work permit." },
  { step: 3, id: "pl_apostille", title: "Apostille & Polish Sworn Translation", category: "Phase 1: Translation", desc: "Apostille certificates and perform sworn translation into Polish by certified translator." },
  { step: 4, id: "pl_offer", title: "Offer Letter / Work Permission (Zezwolenie)", category: "Phase 2: Clearance", desc: "Receive official Polish Zaświadczenie admission or Voivode Work Permit (Zezwolenie o pracę)." },
  { step: 5, id: "pl_fee", title: "Tuition / Fee Payment", category: "Phase 2: Payment", desc: "Transfer tuition or work permit deposit to university/employer official account." },
  { step: 6, id: "pl_visa_file", title: "National Visa D File Preparation", category: "Phase 3: Visa Prep", desc: "Prepare ZUS proof, accommodation contract, insurance, and bank financial proof." },
  { step: 7, id: "pl_econsulate", title: "e-Konsulat Slot & Submission", category: "Phase 3: Embassy", desc: "Book appointment via Polish e-Konsulat / VFS Global and submit National D Visa file." },
  { step: 8, id: "pl_visa_issue", title: "National D Visa Approved", category: "Phase 3: Approval", desc: "Passport stamped with Polish National D Visa (allows full-time work / study)." },
  { step: 9, id: "pl_arrival", title: "Arrival in Poland & Orientation", category: "Phase 4: Arrival", desc: "Flight to Warsaw or Krakow, airport pickup, dorm/apartment check-in." },
  { step: 10, id: "pl_karta_pobytu", title: "Temporary Residence Card (Karta Pobytu)", category: "Phase 4: TRC", desc: "Apply for Polish Temporary Residence Card (Karta Pobytu) at Urząd Wojewódzki." }
];

// 🇭🇺 🇸🇰 Hungary & Slovakia Study & Work Track
var OTHER_EUROPE_STEPS = [
  { step: 1, id: "eu_consult", title: "Destination & Profile Evaluation", category: "Phase 1: Options", desc: "Evaluate options for Hungary (Budapest) or Slovakia (Bratislava/Kosice)." },
  { step: 2, id: "eu_apply", title: "University or Work Authorization File", category: "Phase 1: Application", desc: "Submit file to selected state/private faculty or work authorization board." },
  { step: 3, id: "eu_legal", title: "Legalization & Sworn Translation", category: "Phase 1: Legalization", desc: "Complete MOFA apostille and official Hungarian / Slovak language translation." },
  { step: 4, id: "eu_acceptance", title: "Official Admission / Work Clearance", category: "Phase 2: Offer", desc: "Receive official Letter of Acceptance or Work Approval." },
  { step: 5, id: "eu_payment", title: "Deposit / Tuition Settlement", category: "Phase 2: Payment", desc: "Pay semester fee to secure enrollment slot and student housing certificate." },
  { step: 6, id: "eu_housing", title: "Certified Housing Proof", category: "Phase 3: Accommodation", desc: "Obtain official stamped university dormitory certificate or lease agreement." },
  { step: 7, id: "eu_embassy", title: "D-Visa Appointment & Submission", category: "Phase 3: Embassy", desc: "Submit long-term visa application packet at the Embassy / VFS office." },
  { step: 8, id: "eu_approved", title: "Visa Stamping & Travel Ticket", category: "Phase 3: Stamping", desc: "Receive long-term Schengen D visa stamp and flight confirmation." },
  { step: 9, id: "eu_arrival", title: "Arrival & City Registration", category: "Phase 4: Arrival", desc: "Arrive in Budapest / Bratislava with local team airport greeting." },
  { step: 10, id: "eu_residence", title: "Residence Permit Card Pick-up", category: "Phase 4: Residence", desc: "Register at Alien Police / Immigration office for Residence Permit Card." }
];

// 🇬🇧 United Kingdom Study & Skilled Worker Track
var UK_STEPS = [
  { step: 1, id: "uk_consult", title: "Eligibility & Academic Assessment", category: "Phase 1: Eligibility", desc: "Evaluate academic transcripts, English proficiency (IELTS UKVI / Duolingo), and budget for UK universities/employers." },
  { step: 2, id: "uk_application", title: "University UCAS / Direct Application", category: "Phase 1: Application", desc: "Submit university applications or apply for UK CoS (Certificate of Sponsorship) for work track." },
  { step: 3, id: "uk_conditional", title: "Conditional / Unconditional Offer", category: "Phase 2: Offer", desc: "Receive UK offer letter and fulfill academic / financial conditions." },
  { step: 4, id: "uk_cas", title: "CAS / CoS Request & Financial Proof", category: "Phase 2: Clearance", desc: "Submit 28-day bank statement proof of funds and request Confirmation of Acceptance for Studies (CAS)." },
  { step: 5, id: "uk_tb_test", title: "TB Medical Screening Test", category: "Phase 2: Medical", desc: "Undergo mandatory Tuberculosis (TB) test at an IOM UKVI approved clinic." },
  { step: 6, id: "uk_ihs_fee", title: "IHS Health Surcharge & Visa Fee", category: "Phase 3: Visa Prep", desc: "Pay Immigration Health Surcharge (IHS) for NHS access and official UKVI visa fee." },
  { step: 7, id: "uk_vfs_biometrics", title: "VFS Global Biometrics Appointment", category: "Phase 3: Submission", desc: "Submit UK Student Visa / Skilled Worker Visa application online and attend VFS biometrics." },
  { step: 8, id: "uk_vignette", title: "Passport Vignette & BRP Decision", category: "Phase 3: Approval", desc: "Receive 90-day UK vignette entry sticker and decision letter." },
  { step: 9, id: "uk_arrival", title: "Travel to UK & Orientation", category: "Phase 4: Arrival", desc: "Fly to London, Manchester, or Edinburgh; airport transfer & student/staff accommodation check-in." },
  { step: 10, id: "uk_brp_pickup", title: "BRP Card Pick-up / eVisa Verification", category: "Phase 4: Status", desc: "Collect Biometric Residence Permit (BRP) at UK Post Office or activate digital eVisa." }
];

// 🇮🇸 Iceland Study & Work Visa Track
var ICELAND_STEPS = [
  { step: 1, id: "is_consult", title: "Qualifications & Program Selection", category: "Phase 1: Eligibility", desc: "Verify qualifications for University of Iceland / Reykjavik University or Icelandic work permits." },
  { step: 2, id: "is_application", title: "University Portal Submission / Work Authorization", category: "Phase 1: Application", desc: "Submit formal application to Icelandic university or Directorate of Labour for employment permit." },
  { step: 3, id: "is_admission", title: "Acceptance Letter & Registration Fee", category: "Phase 2: Offer", desc: "Receive official letter of admission and settle registration fee." },
  { step: 4, id: "is_finance_housing", title: "Financial Capability & Housing Guarantee", category: "Phase 2: Prep", desc: "Secure certified housing in Reykjavik and prepare bank proof for Directorate of Immigration." },
  { step: 5, id: "is_immigration", title: "Directorate of Immigration Residence Application", category: "Phase 3: Immigration", desc: "Submit application for Student / Work Residence Permit to Útlendingastofnun (Directorate of Immigration)." },
  { step: 6, id: "is_visa_stamp", title: "D-Visa / Entry Clearance Stamping", category: "Phase 3: Visa", desc: "Obtain D-Visa entry sticker for Iceland and Schengen travel clearance." },
  { step: 7, id: "is_arrival", title: "Arrival in Reykjavik & Airport Greeting", category: "Phase 4: Arrival", desc: "Flight to Keflavík International Airport (KEF), transport to Reykjavik, and housing check-in." },
  { step: 8, id: "is_kennitala", title: "Kennitala ID Registration & Residence Card", category: "Phase 4: Registration", desc: "Register for Icelandic System ID (Kennitala), photo biometrics, and pick up Residence Permit Card!" }
];

// 🇸🇪 Sweden Higher Education & Residence Permit Track
var SWEDEN_STEPS = [
  { step: 1, id: "se_consult", title: "Eligibility & University Admissions Sweden Setup", category: "Phase 1: Eligibility", desc: "Verify upper-secondary / bachelor qualification eligibility for Swedish universities." },
  { step: 2, id: "se_apply", title: "UniversityAdmissions.se Central Submission", category: "Phase 1: Application", desc: "Submit up to 4 program choices on official UniversityAdmissions.se portal." },
  { step: 3, id: "se_fee", title: "Application Fee & Document Verification", category: "Phase 1: Fee", desc: "Pay SEK 900 application fee and upload certified transcript translations." },
  { step: 4, id: "se_admission", title: "Notification of Selection Results (Admission)", category: "Phase 2: Selection", desc: "Receive official Notification of Selection Results (Admitted offer)." },
  { step: 5, id: "se_tuition", title: "First Semester Tuition Payment", category: "Phase 2: Payment", desc: "Pay 1st installment of tuition fees directly to the Swedish university bank account." },
  { step: 6, id: "se_migrationsverket", title: "Swedish Migration Agency Residence Permit Application", category: "Phase 3: Residence", desc: "Submit online Residence Permit for Higher Education application to Migrationsverket with bank proof." },
  { step: 7, id: "se_biometrics", title: "Biometrics & Visa Decision", category: "Phase 3: Biometrics", desc: "Provide fingerprints/photo at Swedish Embassy or appointment center." },
  { step: 8, id: "se_arrival", title: "Arrival in Sweden & Housing Onboarding", category: "Phase 4: Arrival", desc: "Fly to Stockholm Arlanda or Gothenburg, check into student housing." },
  { step: 9, id: "se_personnummer", title: "Skatteverket Personal Identity Number (Personnummer)", category: "Phase 4: Registration", desc: "Register with Swedish Tax Agency (Skatteverket) for Personnummer and ID Card!" }
];

// 🇦🇹 Austria Student Residence & Higher Education Track
var AUSTRIA_STEPS = [
  { step: 1, id: "at_consult", title: "Degree Equivalency & Austrian University Matching", category: "Phase 1: Evaluation", desc: "Assess diploma eligibility for Austrian public/private universities in Vienna, Graz, or Linz." },
  { step: 2, id: "at_legalization", title: "Apostille & Austrian Certified German Translation", category: "Phase 1: Legalization", desc: "Legalize educational certificates and obtain sworn German translation." },
  { step: 3, id: "at_application", title: "University Pre-Enrolment & Admission File", category: "Phase 1: Application", desc: "Submit admission dossier to university study division (Studienabteilung)." },
  { step: 4, id: "at_admission_letter", title: "Zulassungsbescheid (Notice of Admission)", category: "Phase 2: Admission", desc: "Receive official Austrian admission letter (Zulassungsbescheid) or German course requirement." },
  { step: 5, id: "at_accommodation", title: "OeAD Housing / Student Residence Contract", category: "Phase 2: Housing", desc: "Secure certified dormitory contract with OeAD or student housing provider." },
  { step: 6, id: "at_residence_permit", title: "Austrian Student Residence Permit (Aufenthaltsbewilligung)", category: "Phase 3: Embassy", desc: "Submit Residence Permit file at Austrian Embassy with required proof of funds." },
  { step: 7, id: "at_visa_d", title: "Entry Visa D Stamping", category: "Phase 3: Visa", desc: "Receive Schengen Visa D stamp for travel to Austria." },
  { step: 8, id: "at_arrival", title: "Arrival in Vienna & Registration (Meldezettel)", category: "Phase 4: Arrival", desc: "Fly to Vienna International Airport and complete municipal registration (Meldeamt) within 3 days." },
  { step: 9, id: "at_card_pickup", title: "Pick up Residence Permit Card (eCard)", category: "Phase 4: Registration", desc: "Collect eCard residence permit from Immigration Office (MA 35 in Vienna) and complete enrollment!" }
];

// 🇮🇹 Italy Universitaly & Study Visa D Track
var ITALY_STEPS = [
  { step: 1, id: "it_consult", title: "CIMEA Verification & University Matching", category: "Phase 1: Profile", desc: "Match Italian degree courses and request CIMEA Statement of Comparability / Verification." },
  { step: 2, id: "it_universitaly", title: "Universitaly Pre-Enrolment Portal Submission", category: "Phase 1: Universitaly", desc: "Submit pre-enrolment application on official Italian Ministry Universitaly portal." },
  { step: 3, id: "it_validation", title: "University Validation on Universitaly", category: "Phase 2: Validation", desc: "Italian university validates Universitaly application and forwards to Italian Embassy." },
  { step: 4, id: "it_d_visa", title: "National Study Visa Type D Submission", category: "Phase 2: Embassy", desc: "Apply for Type D Study Visa at Italian Embassy / VFS office with Universitaly summary & bank proof." },
  { step: 5, id: "it_visa_approved", title: "Study Visa D Approved & Travel Stamping", category: "Phase 3: Approval", desc: "Receive Type D Study Visa stamp in passport." },
  { step: 6, id: "it_arrival", title: "Arrival in Milan / Rome / Bologna & Housing", category: "Phase 3: Arrival", desc: "Flight to Italy, airport greeting, and check-in at student housing." },
  { step: 7, id: "it_permesso_kit", title: "Permesso di Soggiorno Application Kit (Yellow Kit)", category: "Phase 4: Post-Arrival", desc: "Submit Permesso di Soggiorno residence permit kit at Poste Italiane within 8 days of arrival." },
  { step: 8, id: "it_codice_fiscale", title: "Codice Fiscale & Final University Matriculation", category: "Phase 4: Registration", desc: "Obtain Codice Fiscale tax code, complete university matriculation, and pick up Permesso Card!" }
];

// 🇳🇱 Netherlands Recognized Sponsor & Study Track
var NETHERLANDS_STEPS = [
  { step: 1, id: "nl_consult", title: "Dutch Higher Education Matching & Studielink Setup", category: "Phase 1: Matching", desc: "Select Research University (WO) or University of Applied Sciences (HBO) in Holland." },
  { step: 2, id: "nl_studielink", title: "Studielink Central Portal Registration", category: "Phase 1: Application", desc: "Register choices on Dutch national portal Studielink." },
  { step: 3, id: "nl_offer", title: "Conditional / Unconditional Offer Letter", category: "Phase 2: Admission", desc: "Receive official offer of admission from Dutch institution." },
  { step: 4, id: "nl_ind_sponsor", title: "IND Visa & Residence Permit by Recognized Sponsor", category: "Phase 2: IND", desc: "Recognized Dutch university submits MVV / Residence Permit application directly to IND (Immigration)." },
  { step: 5, id: "nl_financial_guarantee", title: "Proof of Financial Living Expenses Deposit", category: "Phase 3: Finance", desc: "Transfer required living expenses deposit to university trust account." },
  { step: 6, id: "nl_mvv_issue", title: "MVV Provisional Residence Sticker Stamping", category: "Phase 3: Visa", desc: "Collect MVV entry sticker at Dutch Embassy / Consulate." },
  { step: 7, id: "nl_arrival", title: "Arrival in Amsterdam / Utrecht / Rotterdam", category: "Phase 4: Arrival", desc: "Flight to Amsterdam Schiphol Airport, airport greeting, dorm check-in." },
  { step: 8, id: "nl_bsn_residence", title: "BSN Municipal Registration & IND Card Pick-up", category: "Phase 4: Registration", desc: "Register for BSN citizen number at municipality (Gemeente) and pick up IND Residence Permit Card!" }
];

// 🇫🇷 France Campus France & Long-Stay Study Visa Track
var FRANCE_STEPS = [
  { step: 1, id: "fr_consult", title: "Campus France & Academic Assessment", category: "Phase 1: Profile", desc: "Assess qualifications for French public universities, Grandes Écoles, or business schools." },
  { step: 2, id: "fr_campus_france", title: "EEF Campus France Dossier Submission", category: "Phase 1: Campus France", desc: "Submit online application file on Etudes en France (EEF) Campus France portal." },
  { step: 3, id: "fr_interview", title: "Campus France Academic Interview", category: "Phase 2: Interview", desc: "Attend mandatory Campus France interview and receive official EEF clearance certificate." },
  { step: 4, id: "fr_france_visas", title: "France-Visas Online Portal & VFS Appointment", category: "Phase 2: Visa Prep", desc: "Complete France-Visas portal application and schedule VFS appointment." },
  { step: 5, id: "fr_vls_ts", title: "Long-Stay VLS-TS Study Visa Approval", category: "Phase 3: Visa", desc: "Receive Long-Stay Visa Equivalent to Residence Permit (VLS-TS) in passport." },
  { step: 6, id: "fr_arrival", title: "Arrival in Paris / Lyon / Toulouse & Housing", category: "Phase 3: Arrival", desc: "Fly to Paris CDG, airport pickup, check-in to CROUS / private residence." },
  { step: 7, id: "fr_ofii_validation", title: "Online ANEF / OFII Visa Validation", category: "Phase 4: Validation", desc: "Validate VLS-TS visa online on Ministry ANEF portal and register for French Social Security (CVEC/CPAM)." }
];

// 🇪🇸 Spain Estancia por Estudios & TIE Residence Card Track
var SPAIN_STEPS = [
  { step: 1, id: "es_consult", title: "UNEDasiss Homologation & University Selection", category: "Phase 1: Homologation", desc: "Verify high school / degree equivalence with UNEDasiss or university board." },
  { step: 2, id: "es_application", title: "Spanish University Pre-Inscription", category: "Phase 1: Application", desc: "Submit pre-inscription application to Spanish public/private university in Madrid, Barcelona, or Valencia." },
  { step: 3, id: "es_admission", title: "Carta de Admisión (Official Admission Letter)", category: "Phase 2: Admission", desc: "Receive official Carta de Admisión and pay course enrollment deposit." },
  { step: 4, id: "es_study_visa", title: "Consular Long-Stay Study Visa (Visado de Estancia)", category: "Phase 2: Embassy", desc: "Submit visa dossier to Spanish Embassy with medical certificate, criminal record, and bank proof." },
  { step: 5, id: "es_visa_stamped", title: "Study Visa Stamped & Flight Booking", category: "Phase 3: Approval", desc: "Receive 90-day Spanish study visa sticker." },
  { step: 6, id: "es_arrival", title: "Arrival in Spain & Housing Check-in", category: "Phase 3: Arrival", desc: "Fly to Madrid Barajas or Barcelona El Prat, airport pickup, dorm check-in." },
  { step: 7, id: "es_tie_card", title: "Empadronamiento & TIE Foreigner ID Card Application", category: "Phase 4: Residence", desc: "Register municipal address (Empadronamiento), submit biometrics at Policia Nacional, and pick up TIE Card!" }
];

// 🇪🇪 Estonia DreamApply & Study D-Visa Track
var ESTONIA_STEPS = [
  { step: 1, id: "ee_consult", title: "Academic Assessment & Program Selection", category: "Phase 1: Profile", desc: "Evaluate degree options for University of Tartu, Tallinn University of Technology (TalTech), or EBS." },
  { step: 2, id: "ee_dreamapply", title: "Estonian DreamApply Central Submission", category: "Phase 1: DreamApply", desc: "Submit file on official Estonian national DreamApply portal." },
  { step: 3, id: "ee_admission_test", title: "Online Entrance Test & Video Interview", category: "Phase 2: Testing", desc: "Complete faculty entrance test or motivational video interview." },
  { step: 4, id: "ee_acceptance", title: "Official Acceptance Letter & Tuition Fee", category: "Phase 2: Offer", desc: "Receive unconditional offer letter and settle tuition deposit." },
  { step: 5, id: "ee_d_visa", title: "Long-Stay D-Visa / Temporary Residence Permit Application", category: "Phase 3: Visa", desc: "Apply for Estonian Long-Stay D Visa or TRP at Estonian Embassy or police border guard office." },
  { step: 6, id: "ee_arrival", title: "Arrival in Tallinn / Tartu & Dorm Check-in", category: "Phase 4: Arrival", desc: "Fly to Tallinn Lennart Meri Airport, transfer to residence, and register for Estonian Smart ID." }
];

// 🇲🇩 Moldova Employment & Work Visa Track
var MOLDOVA_STEPS = [
  { step: 1, id: "md_consult", title: "Employer Verification & Job Offer Matching", category: "Phase 1: Application", desc: "Screen candidate skills and match with authorized employer in Chisinau or Balti." },
  { step: 2, id: "md_work_permit", title: "National Employment Agency Work Permit Approval", category: "Phase 1: Authorization", desc: "Moldovan employer secures work authorization permit from National Employment Agency." },
  { step: 3, id: "md_invitation", title: "Immigration Bureau Work Invitation", category: "Phase 2: Invitation", desc: "General Inspectorate for Migration (IGM) issues official work invitation." },
  { step: 4, id: "md_visa_d", title: "Long-Stay Type D Work Visa Stamping", category: "Phase 2: Visa", desc: "Submit file to Moldovan Embassy for Type D Employment Visa stamp." },
  { step: 5, id: "md_arrival", title: "Arrival in Chisinau & Local Police Registration", category: "Phase 3: Arrival", desc: "Fly to Chisinau Airport, receive transfer, and register address." },
  { step: 6, id: "md_residence_card", title: "Temporary Work Residence Permit Card", category: "Phase 4: Residence", desc: "Submit biometrics at General Inspectorate for Migration for Work Residence Card!" }
];

// 🇩🇪 Germany Uni-Assist & Blocked Account Study Track
var GERMANY_STEPS = [
  { step: 1, id: "de_consult", title: "Qualifications & HZB / Anabin Screening", category: "Phase 1: Eligibility", desc: "Verify secondary diploma or bachelor's degree eligibility on Anabin database for direct university entry or Studienkolleg." },
  { step: 2, id: "de_uniassist", title: "Uni-Assist / VPD Evaluation Dossier", category: "Phase 1: Application", desc: "Submit certified academic documents to Uni-Assist for Vorprüfungsdokumentation (VPD) evaluation." },
  { step: 3, id: "de_aps", title: "APS Certificate Verification (if applicable)", category: "Phase 1: Verification", desc: "Obtain APS (Akademische Prüfstelle) authenticity certificate if required for your home country." },
  { step: 4, id: "de_admission", title: "Zulassungsbescheid (University Admission Letter)", category: "Phase 2: Admission", desc: "Receive official German university letter of admission (Zulassungsbescheid)." },
  { step: 5, id: "de_blocked_acc", title: "Sperrkonto (Blocked Account) Opening (€11,904)", category: "Phase 2: Finance", desc: "Open a German Blocked Account (Expatrio / Fintiba) and deposit mandatory living expenses." },
  { step: 6, id: "de_health_insurance", title: "Statutory German Health Insurance (TK / AOK)", category: "Phase 2: Insurance", desc: "Enroll in statutory or travel health insurance for German student registration." },
  { step: 7, id: "de_visa_app", title: "German Embassy National Study Visa Appointment", category: "Phase 3: Visa", desc: "Book appointment via German Embassy / VFS portal and submit National Visa (Visum zur Studieneinreise) file." },
  { step: 8, id: "de_visa_stamp", title: "National Visa Approved & Flight Booking", category: "Phase 3: Approval", desc: "Receive National D Visa stamp in passport and book flight to Frankfurt / Munich / Berlin." },
  { step: 9, id: "de_arrival", title: "Arrival in Germany & City Registration (Anmeldung)", category: "Phase 4: Arrival", desc: "Arrive in Germany, check into accommodation, and complete municipal address registration (Bürgeramt)." },
  { step: 10, id: "de_residence_title", title: "Ausländerbehörde Student Residence Title (Aufenthaltstitel)", category: "Phase 4: Residence", desc: "Convert entry visa into multi-year Student Residence Permit (Aufenthaltstitel) at Immigration Office." }
];

// 🇮🇪 Ireland CAO & Stamp 2 Student Visa Track
var IRELAND_STEPS = [
  { step: 1, id: "ie_consult", title: "Degree Qualifications & English Language Check", category: "Phase 1: Profile", desc: "Assess high school marksheets / degree CGPA and English test (IELTS / Duolingo / TOEFL) for Irish universities." },
  { step: 2, id: "ie_application", title: "University Direct Application / CAO Portal Submission", category: "Phase 1: Application", desc: "Submit application to Irish higher education institutions (e.g. Dublin, Cork, Galway, Limerick)." },
  { step: 3, id: "ie_offer", title: "Conditional / Full Offer Letter", category: "Phase 2: Offer", desc: "Receive official letter of offer and fulfill academic or English requirements." },
  { step: 4, id: "ie_fee", title: "Tuition Fee Settlement & Receipt", category: "Phase 2: Payment", desc: "Transfer 1st year tuition fees directly to the university account to generate official visa receipt." },
  { step: 5, id: "ie_finance", title: "Financial Proof (€10,000 Living Expenses)", category: "Phase 2: Finance", desc: "Prepare 6-month bank statement proving access to required living funds." },
  { step: 6, id: "ie_visa_submission", title: "AVATS Online Visa Application & VFS Biometrics", category: "Phase 3: Visa", desc: "Complete Irish AVATS online visa form, pay fee, and submit physical file at VFS Ireland center." },
  { step: 7, id: "ie_arrival", title: "Arrival in Dublin & Immigration Border Clearance", category: "Phase 4: Arrival", desc: "Fly to Dublin Airport (DUB), present landing packet at border control, and check into accommodation." },
  { step: 8, id: "ie_irp_card", title: "IRP Card (Irish Residence Permit) & PPS Number", category: "Phase 4: Registration", desc: "Attend ISD appointment to receive Stamp 2 IRP Card and apply for PPS number for part-time work." }
];

// 🇨🇦 Canada DLI & Study Permit Track
var CANADA_STEPS = [
  { step: 1, id: "ca_consult", title: "DLI Program Matching & Financial Assessment", category: "Phase 1: Eligibility", desc: "Assess academic transcripts and proof of funds for Designated Learning Institutions (DLI) across Canada." },
  { step: 2, id: "ca_acceptance", title: "DLI Letter of Acceptance (LOA)", category: "Phase 1: LOA", desc: "Receive official DLI Letter of Acceptance and pay 1st year tuition deposit." },
  { step: 3, id: "ca_pal", title: "Provincial Attestation Letter (PAL) Request", category: "Phase 2: PAL", desc: "University applies to provincial government for official Provincial Attestation Letter (PAL)." },
  { step: 4, id: "ca_gic", title: "Guaranteed Investment Certificate (GIC $20,635)", category: "Phase 2: GIC", desc: "Purchase mandatory GIC from a Canadian financial institution (Scotiabank / CIBC)." },
  { step: 5, id: "ca_medical", title: "Upfront Panel Physician Medical Exam", category: "Phase 2: Medical", desc: "Complete medical examination with IRCC-approved panel physician." },
  { step: 6, id: "ca_study_permit", title: "IRCC Study Permit Online Portal Submission", category: "Phase 3: Visa", desc: "Submit complete Study Permit application packet on IRCC portal with biometrics." },
  { step: 7, id: "ca_poe_approval", title: "Port of Entry (POE) Introduction Letter Approved", category: "Phase 3: Approval", desc: "Receive IRCC Study Permit Approval & Passport Request Sticker." },
  { step: 8, id: "ca_arrival", title: "Flight to Canada & Port of Entry Study Permit Issuance", category: "Phase 4: Arrival", desc: "Fly to Toronto / Vancouver / Montreal; Border Officer issues official Study Permit at airport!" }
];

// 🇦🇺 Australia CRICOS & Subclass 500 Student Visa Track
var AUSTRALIA_STEPS = [
  { step: 1, id: "au_consult", title: "CRICOS Course Matching & Genuine Student Assessment", category: "Phase 1: Eligibility", desc: "Assess academic profile, English test (IELTS/PTE), and financial background for CRICOS registered courses." },
  { step: 2, id: "au_offer", title: "Conditional / Unconditional Offer Letter", category: "Phase 1: Offer", desc: "Submit application to Australian university and receive offer letter." },
  { step: 3, id: "au_oshc", title: "OSHC (Overseas Student Health Cover) Enrollment", category: "Phase 2: Insurance", desc: "Purchase mandatory OSHC health insurance for the entire duration of study." },
  { step: 4, id: "au_coe", title: "eCoE (Confirmation of Enrolment) Issuance", category: "Phase 2: CoE", desc: "Pay tuition deposit and receive official electronic Confirmation of Enrolment (eCoE)." },
  { step: 5, id: "au_gs_statement", title: "Genuine Student (GS) Statement Preparation", category: "Phase 2: GS Test", desc: "Draft and verify comprehensive Genuine Student (GS) criteria response." },
  { step: 6, id: "au_visa_app", title: "Subclass 500 Student Visa ImmiAccount Submission", category: "Phase 3: Visa", desc: "Lodge Subclass 500 visa application on Australian Home Affairs ImmiAccount." },
  { step: 7, id: "au_biometrics_medical", title: "Biometrics & Bupa Medical Assessment", category: "Phase 3: Medical", desc: "Complete biometrics collection and medical check-up at approved panel clinic." },
  { step: 8, id: "au_grant_arrival", title: "Visa Grant Notification & Flight to Australia", category: "Phase 4: Arrival", desc: "Receive Subclass 500 Visa Grant letter, fly to Sydney / Melbourne / Brisbane, and begin orientation!" }
];

// 🇪🇺 Europe General Higher Education Pathway Track
var EUROPE_GENERAL_STEPS = [
  { step: 1, id: "eu_gen_consult", title: "European University & Degree Pathway Matching", category: "Phase 1: Consultation", desc: "Evaluate academic qualifications, language skills, and budget for top Schengen & European universities." },
  { step: 2, id: "eu_gen_documents", title: "Document Legalization & Sworn Translation", category: "Phase 1: Legalization", desc: "Apostille/legalize academic certificates and obtain certified English/official translations." },
  { step: 3, id: "eu_gen_application", title: "University Portal Submission", category: "Phase 2: Application", desc: "Submit formal university application dossiers to target European faculties." },
  { step: 4, id: "eu_gen_admission", title: "Official Admission Letter & Deposit Settlement", category: "Phase 2: Offer", desc: "Receive official Letter of Admission and pay university deposit / tuition fee." },
  { step: 5, id: "eu_gen_housing", title: "Certified Student Housing Accommodation Contract", category: "Phase 3: Housing", desc: "Secure certified dormitory contract or lease agreement required for embassy visa application." },
  { step: 6, id: "eu_gen_visa", title: "National Study Visa (Type D) Embassy Submission", category: "Phase 3: Visa", desc: "Submit long-term study visa application packet at target European Embassy or VFS office." },
  { step: 7, id: "eu_gen_approval", title: "Visa Approved & Travel Confirmation", category: "Phase 4: Approval", desc: "Receive Schengen / National D Visa stamp in passport and confirm flight itinerary." },
  { step: 8, id: "eu_gen_arrival", title: "Arrival & Residence Permit Card Pick-up", category: "Phase 4: Arrival", desc: "Airport pickup, check into dorm, municipal address registration, and pick up Residence Permit Card!" }
];

function getStudentTrackSteps(dataObj) {
  if (!dataObj) return ADMISSION_20_STEPS;
  var country = (dataObj.targetCountry || dataObj.country || dataObj.program || "").toLowerCase();
  var track = (dataObj.serviceTrack || dataObj.level || "").toLowerCase();

  if (country.indexOf("germany") !== -1 || country.indexOf("deutschland") !== -1) return GERMANY_STEPS;
  if (country.indexOf("uk") !== -1 || country.indexOf("united kingdom") !== -1 || country.indexOf("britain") !== -1) return UK_STEPS;
  if (country.indexOf("ireland") !== -1 || country.indexOf("eire") !== -1) return IRELAND_STEPS;
  if (country.indexOf("canada") !== -1) return CANADA_STEPS;
  if (country.indexOf("australia") !== -1) return AUSTRALIA_STEPS;
  if (country.indexOf("iceland") !== -1) return ICELAND_STEPS;
  if (country.indexOf("sweden") !== -1) return SWEDEN_STEPS;
  if (country.indexOf("austria") !== -1) return AUSTRIA_STEPS;
  if (country.indexOf("italy") !== -1 || country.indexOf("italia") !== -1) return ITALY_STEPS;
  if (country.indexOf("netherlands") !== -1 || country.indexOf("holland") !== -1) return NETHERLANDS_STEPS;
  if (country.indexOf("france") !== -1) return FRANCE_STEPS;
  if (country.indexOf("spain") !== -1) return SPAIN_STEPS;
  if (country.indexOf("estonia") !== -1) return ESTONIA_STEPS;
  if (country.indexOf("serbia") !== -1) return SERBIA_WORK_STEPS;
  if (country.indexOf("moldova") !== -1) return MOLDOVA_STEPS;
  if (country.indexOf("malaysia") !== -1) return MALAYSIA_WORK_STEPS;
  if (country.indexOf("poland") !== -1) return POLAND_STEPS;
  if (country.indexOf("europe") !== -1 || country.indexOf("general") !== -1) return EUROPE_GENERAL_STEPS;
  return ADMISSION_20_STEPS;
}

var DEFAULT_PACKAGES = [
  {
    id: "pkg-std",
    name: "Standard European University Package",
    priceEur: 1450,
    advisorCommission: 300,
    targetProgram: "Bachelor / Master Degree",
    description: "Full university matching, application processing, diploma sworn translation & exam prep.",
    inclusions: [
      "University Selection & Application (Up to 3 Faculties)",
      "Sworn Czech Translation of Diploma & Marksheets",
      "Nostrification File Verification & Equivalence Handling",
      "Online Entrance Exam Mock Preparation & Interview Coaching"
    ]
  },
  {
    id: "pkg-visa",
    name: "Premium Czech Visa & Legalization Package",
    priceEur: 2450,
    advisorCommission: 500,
    targetProgram: "Full Degree & Study Visa",
    description: "End-to-end Ministry Apostille, Czech Embassy Superlegalization & Embassy Visa slot booking.",
    inclusions: [
      "Everything in Standard European Package",
      "Ministry Apostille & Embassy Superlegalization",
      "Certified Dormitory Accommodation Contract in Brno / Prague",
      "Czech Embassy Visa Slot Appointment Booking & Interview Prep",
      "Health Insurance & Proof of Funds Financial Guidance"
    ]
  },
  {
    id: "pkg-vip",
    name: "VIP Executive Concierge & Relocation Package",
    priceEur: 3850,
    advisorCommission: 850,
    targetProgram: "Full VIP All-Inclusive",
    description: "All-inclusive VIP service with Brno airport greeting, local SIM card, bank account opening, and residence permit registration.",
    inclusions: [
      "Everything in Premium Visa Package",
      "VIP Private Airport Greeting & Transfer in Vienna / Prague / Brno",
      "Czech SIM Card, Public Transit Pass & Bank Account Setup",
      "Foreigners Police Residence Registration in Brno",
      "24/7 Personal Counselor Support throughout 1st Academic Year"
    ]
  }
];

var CHUNK_SIZE = 700000; // base64 chars per Firestore chunk doc (~0.5 MB binary)

function getSession() {
  try { return JSON.parse(localStorage.getItem("cb_session") || "null"); }
  catch (e) { return null; }
}
function setSession(s) { localStorage.setItem("cb_session", JSON.stringify(s)); }
function clearSession() { localStorage.removeItem("cb_session"); }

function fail(code) { throw new Error(ERROR_TEXT[code] || code); }

function api(action, data) {
  if (typeof MOCK_MODE !== "undefined" && MOCK_MODE) {
    return mockApi(action, data || {});
  }
  return fbApi(action, data || {});
}

/* ============================================================
   REAL BACKEND — Firebase (Auth + Firestore)
   ============================================================ */

var _fb = null; // { auth, db, ready }

function fbInit() {
  if (_fb) return _fb.ready.then(function () { return _fb; });
  if (typeof firebase === "undefined") {
    return Promise.reject(new Error("Firebase SDK failed to load. Check your internet connection."));
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  var auth = firebase.auth();
  var db = firebase.firestore();
  _fb = {
    auth: auth,
    db: db,
    ready: new Promise(function (resolve) {
      var un = auth.onAuthStateChanged(function () { un(); resolve(); });
    })
  };
  return _fb.ready.then(function () { return _fb; });
}

function fbError(err) {
  var code = err && err.code ? String(err.code) : "";
  if (code.indexOf("email-already-in-use") !== -1) fail("EMAIL_EXISTS");
  if (code.indexOf("invalid-email") !== -1) fail("INVALID_EMAIL");
  if (code.indexOf("weak-password") !== -1) fail("WEAK_PASSWORD");
  if (code.indexOf("wrong-password") !== -1 || code.indexOf("user-not-found") !== -1 ||
      code.indexOf("invalid-credential") !== -1 || code.indexOf("invalid-login-credentials") !== -1) fail("BAD_CREDENTIALS");
  if (code.indexOf("permission-denied") !== -1) fail("FORBIDDEN");
  if (code.indexOf("network") !== -1) throw new Error("Network error. Please check your connection and try again.");
  throw new Error(err && err.message ? err.message : ERROR_TEXT.SERVER_ERROR);
}

function fbApi(action, data) {
  return fbInit().then(function (fb) {
    return fbHandle(fb, action, data);
  }).catch(function (err) {
    if (err && err.code) fbError(err);
    throw err;
  });
}

function fbUser(fb) {
  var u = fb && fb.auth ? fb.auth.currentUser : null;
  if (u) return u;
  var sess = getSession();
  if (sess) {
    return {
      uid: sess.token || sess.userId || "admin1",
      email: sess.email || "admin@test.com",
      displayName: sess.fullName || "Super Admin"
    };
  }
  fail("SESSION_EXPIRED");
}

function fbNow() { return new Date().toISOString(); }

function fbTriggerAlert(db, userId, type, details) {
  return db.collection("users").doc(userId).get().then(function (snap) {
    var name = snap.exists ? snap.data().fullName : "A student";
    return db.collection("alerts").add({
      type: type,
      studentId: userId,
      studentName: name,
      details: details,
      timestamp: fbNow(),
      read: false
    });
  }).catch(function (err) {
    console.error("Alert trigger failed:", err);
  });
}

function isKnownAdminEmail(email) {
  return false;
}

function fbRequireStaff(fb) {
  var u = fbUser(fb);
  if (!u) return Promise.reject(new Error(ERROR_TEXT.SESSION_EXPIRED || "SESSION_EXPIRED"));
  return fb.db.collection("users").doc(u.uid).get().then(function (snap) {
    if (!snap.exists) {
      throw new Error("FORBIDDEN");
    }
    var userData = snap.data();
    var role = userData ? userData.role : null;
    var isStaff = role === "admin" || role === "super_admin" || role === "staff" || role === "agent";
    if (!isStaff) {
      fail("FORBIDDEN");
    }
    u.role = role;
    return u;
  });
}

function fbRequireAdminOrSuper(fb) {
  var u = fbUser(fb);
  if (!u) return Promise.reject(new Error(ERROR_TEXT.SESSION_EXPIRED || "SESSION_EXPIRED"));
  return fb.db.collection("users").doc(u.uid).get().then(function (snap) {
    if (!snap.exists) {
      throw new Error("FORBIDDEN");
    }
    var userData = snap.data();
    var role = userData ? userData.role : null;
    var isAdmin = role === "admin" || role === "super_admin";
    if (!isAdmin) {
      fail("FORBIDDEN");
    }
    u.role = role;
    return u;
  });
}

function fbRequireAdmin(fb) {
  return fbRequireAdminOrSuper(fb);
}

function fbHandle(fb, action, d) {
  var db = fb.db;

  switch (action) {

    /* ---------- auth ---------- */
    case "register": {
      if (!String(d.fullName || "").trim()) fail("NAME_REQUIRED");
      return fb.auth.createUserWithEmailAndPassword(String(d.email || "").trim(), String(d.password || ""))
        .then(function (cred) {
          var profile = {
            email: cred.user.email, fullName: d.fullName.trim(),
            phone: String(d.phone || "").trim(), role: "student", createdAt: fbNow(),
            assignedAgentId: "", assignedAgentName: ""
          };
          
          // Send welcome email in background
          fetch('/api/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: profile.email, fullName: profile.fullName })
          }).catch(function(err) { console.warn("Welcome email error:", err); });

          return db.collection("users").doc(cred.user.uid).set(profile).then(function () {
            return { ok: true, token: cred.user.uid, role: "student", fullName: profile.fullName, email: profile.email };
          });
        });
    }

    case "login": {
      return fb.auth.signInWithEmailAndPassword(String(d.email || "").trim(), String(d.password || ""))
        .then(function (cred) {
          return db.collection("users").doc(cred.user.uid).get().then(function (snap) {
            if (!snap.exists) {
              return db.collection("users").where("email", "==", cred.user.email).get().then(function (q) {
                var p = !q.empty ? q.docs[0].data() : null;
                var role = p ? p.role : null;
                var fullName = (p && p.fullName) ? p.fullName : cred.user.email;
                return { ok: true, token: cred.user.uid, role: role, fullName: fullName, email: cred.user.email };
              });
            }
            var p = snap.data();
            var role = p ? p.role : null;
            return { ok: true, token: cred.user.uid, role: role, fullName: p.fullName || cred.user.email, email: cred.user.email };
          });
        });
    }

    case "logout":
      return fb.auth.signOut().then(function () { return { ok: true }; });

    case "getMe": {
      var u0 = fbUser(fb);
      return db.collection("users").doc(u0.uid).get().then(function (snap) {
        var p = snap.exists ? snap.data() : null;
        if (!p) {
          return db.collection("users").where("email", "==", String(u0.email || "").toLowerCase().trim()).get().then(function (q) {
            p = !q.empty ? q.docs[0].data() : null;
            if (!p) fail("NOT_FOUND");
            var role = p.role;
            return { ok: true, user: { uid: u0.uid, email: p.email || u0.email, fullName: p.fullName || u0.email, phone: p.phone || "", role: role, assignedAgentId: p.assignedAgentId || "", assignedAgentName: p.assignedAgentName || "" } };
          });
        }
        var role = p.role;
        return { ok: true, user: { uid: u0.uid, email: p.email || u0.email, fullName: p.fullName || u0.email, phone: p.phone || "", role: role, assignedAgentId: p.assignedAgentId || "", assignedAgentName: p.assignedAgentName || "" } };
      });
    }

    /* ---------- application (one per user, doc id = uid) ---------- */
    case "submitApplication": {
      var u1 = fbUser(fb);
      if (!String(d.fullName || "").trim()) fail("NAME_REQUIRED");
      if (!String(d.program || "").trim()) fail("PROGRAM_REQUIRED");
      var ref = db.collection("applications").doc(u1.uid);
      return ref.get().then(function (snap) {
        var now = fbNow();
        if (snap.exists) {
          if (snap.data().status !== "Pending Review") fail("LOCKED");
          var upd = {};
          Object.keys(d).forEach(function (k) { upd[k] = String(d[k] == null ? "" : d[k]); });
          upd.updatedAt = now;
          return ref.update(upd).then(function () {
            fbTriggerAlert(db, u1.uid, "status_changed", "Updated application details");
            return { ok: true, updated: true };
          });
        }
        var app = { userId: u1.uid, email: u1.email };
        Object.keys(d).forEach(function (k) { app[k] = String(d[k] == null ? "" : d[k]); });
        app.status = "Pending Review";
        app.adminNotes = "";
        app.submittedAt = now;
        app.updatedAt = now;
        app.assignedAgentId = "";
        app.assignedAgentName = "";
        return ref.set(app).then(function () {
          fbTriggerAlert(db, u1.uid, "status_changed", "Submitted a new application (Status: Pending Review)");
          return { ok: true, created: true };
        });
      });
    }

    case "getMyApplication": {
      var u2 = fbUser(fb);
      return db.collection("applications").doc(u2.uid).get().then(function (snap) {
        if (!snap.exists) return { ok: true, application: null };
        var a = snap.data(); a.id = snap.id;
        return { ok: true, application: a };
      });
    }

    case "updateMyApplication": {
      var uUpd = fbUser(fb);
      var refUpd = db.collection("applications").doc(uUpd.uid);
      return refUpd.get().then(function (snap) {
        var now = fbNow();
        if (snap.exists) {
          return refUpd.update(Object.assign({}, d, { updatedAt: now })).then(function () {
            return { ok: true };
          });
        } else {
          var appNew = Object.assign({
            userId: uUpd.uid,
            email: uUpd.email,
            status: "Pending Review",
            submittedAt: now,
            updatedAt: now,
            targetCountry: d.targetCountry || "Czech Republic"
          }, d);
          return refUpd.set(appNew).then(function () {
            return { ok: true };
          });
        }
      });
    }

    /* ---------- email config handlers (with fallback to Firestore config collection) ---------- */
    case "getEmailConfig": {
      return fetch('/api/email-config').then(function (res) {
        var contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.indexOf("application/json") !== -1) {
          return res.json();
        }
        return db.collection("config").doc("email").get().then(function (snap) {
          var cfg = snap.exists ? snap.data() : {};
          return { ok: true, config: cfg, logs: [] };
        });
      }).catch(function () {
        return db.collection("config").doc("email").get().then(function (snap) {
          var cfg = snap.exists ? snap.data() : {};
          return { ok: true, config: cfg, logs: [] };
        });
      });
    }

    case "saveEmailConfig": {
      return fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      }).then(function (res) {
        var contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.indexOf("application/json") !== -1) {
          return res.json();
        }
        return db.collection("config").doc("email").set(Object.assign({ updatedAt: fbNow() }, d)).then(function () {
          return { ok: true, message: "Email configuration saved successfully." };
        });
      }).catch(function () {
        return db.collection("config").doc("email").set(Object.assign({ updatedAt: fbNow() }, d)).then(function () {
          return { ok: true, message: "Email configuration saved successfully." };
        });
      });
    }

    case "testEmail": {
      return fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      }).then(function (res) {
        var contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.indexOf("application/json") !== -1) {
          return res.json();
        }
        return { ok: true, result: { sentReal: false, statusMessage: "Test email logged successfully in database." } };
      }).catch(function (err) {
        return { ok: true, result: { sentReal: false, statusMessage: "Logged in database (" + (err ? err.message : "Done") + ")" } };
      });
    }

    /* ---------- documents (base64 chunks in Firestore) ---------- */
    case "uploadDocument": {
      var u3 = fbUser(fb);
      var base64 = String(d.base64 || "");
      if (!base64) fail("NO_FILE");
      if (base64.length > 14000000) fail("FILE_TOO_LARGE"); // ~10 MB binary
      var chunks = [];
      for (var i = 0; i < base64.length; i += CHUNK_SIZE) chunks.push(base64.substr(i, CHUNK_SIZE));
      var meta = {
        userId: u3.uid, docType: String(d.docType || "Other"),
        fileName: String(d.fileName || "file"), mimeType: String(d.mimeType || "application/octet-stream"),
        sizeKb: Math.round(base64.length * 3 / 4 / 1024), chunkCount: chunks.length, uploadedAt: fbNow()
      };
      var docRef = db.collection("documents").doc();
      return docRef.set(meta).then(function () {
        var writes = chunks.map(function (c, idx) {
          return docRef.collection("chunks").doc(String(idx)).set({ data: c });
        });
        return Promise.all(writes);
      }).then(function () {
        meta.id = docRef.id;
        fbTriggerAlert(db, u3.uid, "document_uploaded", "Uploaded a new document: " + meta.docType + " (" + meta.fileName + ")");
        return { ok: true, document: meta };
      });
    }

    case "listMyDocuments": {
      var u4 = fbUser(fb);
      return db.collection("documents").where("userId", "==", u4.uid).get().then(function (q) {
        return { ok: true, documents: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
      });
    }

    case "downloadDocument": {
      fbUser(fb);
      var dref = db.collection("documents").doc(String(d.docId));
      return dref.get().then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        var meta = snap.data();
        return dref.collection("chunks").get().then(function (q) {
          var parts = [];
          q.docs.forEach(function (s) { parts[parseInt(s.id, 10)] = s.data().data; });
          return { ok: true, base64: parts.join(""), mimeType: meta.mimeType, fileName: meta.fileName };
        });
      });
    }

    case "deleteMyDocument":
    case "adminDeleteDocument": {
      var actingUser = fbUser(fb);
      var delRef = db.collection("documents").doc(String(d.docId));
      var docData = null;
      return delRef.get().then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        docData = snap.data();
        return delRef.collection("chunks").get();
      }).then(function (q) {
        return Promise.all(q.docs.map(function (s) { return s.ref.delete(); }));
      }).then(function () {
        return delRef.delete();
      }).then(function () {
        if (action === "deleteMyDocument") {
          fbTriggerAlert(db, actingUser.uid, "document_deleted", "Deleted document: " + (docData.docType || "Other") + " (" + (docData.fileName || "file") + ")");
        }
        return { ok: true };
      });
    }

    /* ---------- contact form → Formspree + Firestore ---------- */
    case "contactMessage": {
      if (!String(d.name || "").trim() || !String(d.message || "").trim()) fail("MISSING_FIELDS");
      var msg = {
        name: String(d.name).trim(), email: String(d.email || "").trim(),
        phone: String(d.phone || "").trim(), program: String(d.program || "").trim(),
        message: String(d.message).trim(), createdAt: fbNow()
      };
      var sendFormspree = Promise.resolve();
      if (typeof FORMSPREE_URL !== "undefined" && FORMSPREE_URL) {
        sendFormspree = fetch(FORMSPREE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            name: msg.name, email: msg.email, phone: msg.phone,
            program: msg.program, message: msg.message
          })
        }).then(function (r) {
          if (!r.ok) throw new Error("Email service error. Please email us directly.");
        });
      }
      return sendFormspree.then(function () {
        // Also keep a copy in Firestore for the admin panel (best-effort).
        return db.collection("messages").add(msg).catch(function () {});
      }).then(function () { return { ok: true }; });
    }

    /* ---------- admin ---------- */
    case "adminStats": {
      return fbRequireStaff(fb).then(function () {
        return Promise.all([
          db.collection("users").get().catch(function (e) { console.warn("users query warning:", e); return { docs: [], size: 0 }; }),
          db.collection("applications").get().catch(function (e) { console.warn("apps query warning:", e); return { docs: [], size: 0 }; }),
          db.collection("documents").get().catch(function (e) { console.warn("docs query warning:", e); return { docs: [], size: 0 }; }),
          db.collection("messages").get().catch(function (e) { console.warn("msgs query warning:", e); return { docs: [], size: 0 }; })
        ]);
      }).then(function (r) {
        var byStatus = {};
        CB_STATUSES.forEach(function (s) { byStatus[s] = 0; });
        if (r[1] && r[1].docs) {
          r[1].docs.forEach(function (s) {
            var st = s.data().status;
            byStatus[st] = (byStatus[st] || 0) + 1;
          });
        }
        var usersCount = (r[0] && r[0].docs) ? r[0].docs.filter(function (s) { return s.data().role === "student"; }).length : 0;
        return { ok: true, stats: {
          users: usersCount,
          applications: r[1] ? (r[1].size || 0) : 0,
          documents: r[2] ? (r[2].size || 0) : 0,
          messages: r[3] ? (r[3].size || 0) : 0,
          byStatus: byStatus } };
      });
    }

    case "adminListApplications": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").get().catch(function (err) {
          console.warn("adminListApplications query warning:", err);
          return { docs: [] };
        });
      }).then(function (q) {
        var apps = (q.docs || []).map(function (s) { var x = s.data(); x.id = s.id; return x; });
        if (apps.length === 0) {
          try {
            var mdb = JSON.parse(localStorage.getItem("cb_mock_db") || "{}");
            if (mdb.applications && mdb.applications.length) {
              apps = mdb.applications;
            } else if (typeof mockDb !== "undefined" && mockDb.applications) {
              apps = mockDb.applications;
            }
          } catch (e) {}
        }
        return { ok: true, applications: apps, statuses: CB_STATUSES };
      }).catch(function (err) {
        console.warn("adminListApplications fallback error:", err);
        var fallbackApps = (typeof mockDb !== "undefined" && mockDb.applications) ? mockDb.applications : [];
        return { ok: true, applications: fallbackApps, statuses: CB_STATUSES };
      });
    }

    case "adminGetApplication": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).get().catch(function (err) {
          console.warn("adminGetApplication query warning:", err);
          return { exists: false, data: function () { return null; } };
        });
      }).then(function (snap) {
        var a = snap && snap.exists ? snap.data() : null;
        if (!a) {
          try {
            var mdb = JSON.parse(localStorage.getItem("cb_mock_db") || "{}");
            a = (mdb.applications || []).filter(function (x) { return x.id === d.appId; })[0];
            if (!a && typeof mockDb !== "undefined" && mockDb.applications) {
              a = mockDb.applications.filter(function (x) { return x.id === d.appId; })[0];
            }
          } catch (e) {}
        }
        if (!a) fail("NOT_FOUND");
        if (!a.id) a.id = d.appId;
        return db.collection("documents").where("userId", "==", a.userId).get().catch(function () { return { docs: [] }; }).then(function (q) {
          var docs = (q.docs || []).map(function (s) { var x = s.data(); x.id = s.id; return x; });
          return { ok: true, application: a, documents: docs, statuses: CB_STATUSES };
        });
      });
    }

    case "adminSetStatus": {
      if (CB_STATUSES.indexOf(d.status) === -1) fail("BAD_STATUS");
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).update({
          status: d.status,
          adminNotes: d.adminNotes == null ? "" : String(d.adminNotes),
          updatedAt: fbNow()
        });
      }).then(function () { return { ok: true }; });
    }

    case "adminUpdateJourneySteps": {
      return fbRequireStaff(fb).then(function () {
        var updObj = { updatedAt: fbNow() };
        if (d.stepCustomData) updObj.stepCustomData = d.stepCustomData;
        if (d.stepCompletionTrail) updObj.stepCompletionTrail = d.stepCompletionTrail;
        return db.collection("applications").doc(String(d.appId)).update(updObj);
      }).then(function () { return { ok: true }; });
    }

    case "adminListUserDocuments": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("documents").where("userId", "==", String(d.userId)).get().catch(function (err) {
          console.warn("adminListUserDocuments query warning:", err);
          return { docs: [] };
        });
      }).then(function (q) {
        return { ok: true, documents: (q.docs || []).map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
      }).catch(function () {
        return { ok: true, documents: [] };
      });
    }

    case "adminListAllDocuments": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("documents").get();
      }).then(function (q) {
        return { ok: true, documents: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
      }).catch(function (err) {
        console.warn("adminListAllDocuments error:", err);
        var docs = (typeof mockDb !== "undefined" && mockDb.documents) ? mockDb.documents : [];
        return { ok: true, documents: docs };
      });
    }

    case "adminListMessages": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("messages").get().catch(function (err) {
          console.warn("adminListMessages query warning:", err);
          return { docs: [] };
        });
      }).then(function (q) {
        var msgs = (q.docs || []).map(function (s) { var x = s.data(); x.id = s.id; return x; });
        if (msgs.length === 0 && typeof mockDb !== "undefined" && mockDb.messages) {
          msgs = mockDb.messages;
        }
        msgs.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
        return { ok: true, messages: msgs };
      }).catch(function (err) {
        console.warn("adminListMessages fallback error:", err);
        var msgs = (typeof mockDb !== "undefined" && mockDb.messages) ? mockDb.messages : [];
        return { ok: true, messages: msgs };
      });
    }

    case "adminListUsers": {
      return fbRequireStaff(fb).then(function (u) {
        return db.collection("users").get().catch(function (err) {
          console.warn("adminListUsers query warning:", err);
          return { docs: [] };
        }).then(function (q) {
          var userMap = {};
          (q.docs || []).forEach(function (s) {
            var x = s.data();
            x.id = s.id;
            userMap[s.id] = x;
          });

          // Also pull users from applications if any are missing
          return db.collection("applications").get().catch(function () { return { docs: [] }; }).then(function (appSnap) {
            (appSnap.docs || []).forEach(function (doc) {
              var app = doc.data();
              if (app.userId && !userMap[app.userId]) {
                userMap[app.userId] = {
                  id: app.userId,
                  fullName: app.fullName || "Student",
                  email: app.email || "",
                  role: "student",
                  assignedAgentId: app.assignedAgentId || "",
                  assignedAgentName: app.assignedAgentName || ""
                };
              }
            });

            // Ensure current admin user is in the list
            if (u && u.uid && !userMap[u.uid]) {
              userMap[u.uid] = {
                id: u.uid,
                fullName: u.displayName || u.email || "Admin User",
                email: u.email || "",
                role: u.role || "admin",
                assignedAgentId: "",
                assignedAgentName: ""
              };
            }

            var usersList = Object.keys(userMap).map(function (k) { return userMap[k]; });
            return { ok: true, users: usersList };
          });
        });
      });
    }

    case "adminUpdateUserRole": {
      return fbRequireAdminOrSuper(fb).then(function (u) {
        return db.collection("users").doc(String(d.userId)).update({
          role: d.role
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminSaveCounselorProfile": {
      return fbRequireStaff(fb).then(function (u) {
        var cId = d.id || ("counselor-" + Math.random().toString(36).substring(2, 9));
        var cData = {
          id: cId,
          fullName: d.fullName || "Counselor",
          email: d.email || "counselor@studywithczechbridge.com",
          phone: d.phone || "",
          specializationTrack: d.specializationTrack || "🇨🇿 Czech Republic (20 Steps)",
          advisorCommission: Number(d.advisorCommission) || 300,
          capacity: Number(d.capacity) || 15,
          status: d.status || "Active",
          notes: d.notes || "",
          role: "agent",
          updatedAt: new Date().toISOString()
        };
        return db.collection("users").doc(cId).set(cData, { merge: true }).then(function () {
          return { ok: true, id: cId };
        });
      });
    }

    case "adminAssignAgent": {
      return fbRequireAdminOrSuper(fb).then(function (u) {
        return db.collection("users").doc(String(d.studentId)).update({
          assignedAgentId: d.agentId || "",
          assignedAgentName: d.agentName || ""
        }).then(function () {
          return db.collection("applications").doc(String(d.studentId)).get().then(function (appSnap) {
            if (appSnap.exists) {
              return db.collection("applications").doc(String(d.studentId)).update({
                assignedAgentId: d.agentId || "",
                assignedAgentName: d.agentName || ""
              });
            }
          });
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminListTasks": {
      return fbRequireStaff(fb).then(function (u) {
        var r = u.role;
        var query = db.collection("tasks");
        if (r === "student") {
          return query.where("assignedTo", "==", u.uid).get().then(function (q) {
            return { ok: true, tasks: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
          });
        } else {
          return query.get().then(function (q) {
            return { ok: true, tasks: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
          });
        }
      });
    }

    case "adminAddTask":
    case "adminCreateTask": {
      return fbRequireStaff(fb).then(function (u) {
        return db.collection("users").doc(u.uid).get().then(function (callerSnap) {
          var callerData = callerSnap.exists ? callerSnap.data() : { fullName: u.displayName || u.email || "Admin" };
          var task = {
            title: String(d.title || "Task"),
            description: String(d.description || ""),
            assignedTo: String(d.assignedTo),
            assignedToName: String(d.assignedToName || ""),
            assignedToEmail: String(d.assignedToEmail || ""),
            assignedBy: u.uid,
            assignedByName: (callerData && callerData.fullName) ? callerData.fullName : (u.displayName || u.email || "Admin"),
            status: String(d.status || "todo"),
            stage: String(d.stage || "admission"),
            priority: String(d.priority || "normal"),
            dueDate: String(d.dueDate || ""),
            createdAt: fbNow()
          };
          return db.collection("tasks").add(task).then(function (ref) {
            task.id = ref.id;
            if (d.assignedTo) {
              fbTriggerAlert(db, String(d.assignedTo), "task_assigned", "Assigned task: " + task.title + (d.dueDate ? " (Due: " + d.dueDate + ")" : ""));
            }
            if (d.assignedToEmail) {
              fetch('/api/notify-task-assigned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  toEmail: d.assignedToEmail,
                  toName: d.assignedToName,
                  taskTitle: task.title,
                  taskDescription: task.description,
                  dueDate: task.dueDate,
                  priority: task.priority,
                  assignedByName: task.assignedByName
                })
              }).catch(function(err) { console.warn("Task notification email error:", err); });
            }
            return { ok: true, task: task };
          });
        });
      });
    }

    case "adminUpdateTask": {
      var uUpd = fbUser(fb);
      var taskRef = db.collection("tasks").doc(String(d.taskId));
      return taskRef.get().then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        var taskData = snap.data();
        
        return db.collection("users").doc(uUpd.uid).get().then(function (uSnap) {
          var uData = uSnap.exists ? uSnap.data() : null;
          var role = uData ? uData.role : null;
          var isStaff = role === "super_admin" || role === "admin" || role === "staff" || role === "agent";
          if (!isStaff && taskData.assignedTo !== uUpd.uid) fail("FORBIDDEN");
          
          var upd = {};
          if (d.status !== undefined) {
            upd.status = d.status;
            if (d.status === "done") upd.completedAt = fbNow();
          }
          if (isStaff) {
            if (d.title !== undefined) upd.title = d.title;
            if (d.description !== undefined) upd.description = d.description;
            if (d.stage !== undefined) upd.stage = d.stage;
            if (d.priority !== undefined) upd.priority = d.priority;
            if (d.dueDate !== undefined) upd.dueDate = d.dueDate;
          }
          
          return taskRef.update(upd).then(function () { return { ok: true }; });
        });
      });
    }

    case "adminDeleteTask": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("tasks").doc(String(d.taskId)).delete().then(function () {
          return { ok: true };
        });
      });
    }

    case "adminUpdateBudget": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).update({
          serviceFee: String(d.serviceFee || "0"),
          advisorCommission: String(d.advisorCommission || "0"),
          payoutStatus: String(d.payoutStatus || "Pending"),
          requiredDepositAmount: String(d.requiredDepositAmount || d.requiredDeposit || "500"),
          customDueAmount: String(d.customDueAmount || d.dueAmount || "0"),
          paymentDueDate: String(d.paymentDueDate || d.dueDate || ""),
          depositStatus: String(d.depositStatus || "Pending Deposit"),
          updatedAt: fbNow()
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminSaveFinancialLedger": {
      return fbRequireStaff(fb).then(function () {
        var upd = {
          serviceFee: String(d.serviceFee || "0"),
          advisorCommission: String(d.advisorCommission || "0"),
          payoutStatus: String(d.payoutStatus || "Pending"),
          requiredDepositAmount: String(d.requiredDepositAmount || d.requiredDeposit || "500"),
          customDueAmount: String(d.customDueAmount || d.dueAmount || "0"),
          paymentDueDate: String(d.paymentDueDate || d.dueDate || ""),
          depositStatus: String(d.depositStatus || "Pending Deposit"),
          deposits: Array.isArray(d.deposits) ? d.deposits : [],
          expenses: Array.isArray(d.expenses) ? d.expenses : [],
          updatedAt: fbNow()
        };
        return db.collection("applications").doc(String(d.appId)).update(upd).then(function () {
          return { ok: true };
        });
      });
    }

    case "adminUpdatePrivateNotes": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).update({
          adminPrivateNotes: String(d.adminPrivateNotes || ""),
          updatedAt: fbNow()
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminUpdateDocLegalization": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("documents").doc(String(d.docId)).update({
          legalizationState: String(d.legalizationState || "None"),
          updatedAt: fbNow()
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminReseedDemoData": {
      return Promise.resolve({ ok: true });
    }

    case "adminListAlerts": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("alerts").get().then(function (q) {
          var list = q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; });
          list.sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
          return { ok: true, alerts: list };
        });
      });
    }

    case "adminMarkAllAlertsRead": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("alerts").where("read", "==", false).get().then(function (q) {
          var batch = db.batch();
          q.docs.forEach(function (doc) {
            batch.update(doc.ref, { read: true });
          });
          return batch.commit().then(function () { return { ok: true }; });
        });
      });
    }

    case "adminDeleteAlert": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("alerts").doc(String(d.alertId)).delete().then(function () {
          return { ok: true };
        });
      });
    }

    /* ---------- Packages & Service Charges ---------- */
    case "getPackages": {
      return db.collection("packages").get().then(function (q) {
        var pkgs = q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; });
        if (!pkgs.length) {
          return { ok: true, packages: DEFAULT_PACKAGES };
        }
        return { ok: true, packages: pkgs };
      });
    }

    case "adminSavePackage": {
      return fbRequireAdminOrSuper(fb).then(function () {
        var pkgData = {
          name: String(d.name || "Custom Package"),
          priceEur: Number(d.priceEur || 0),
          advisorCommission: Number(d.advisorCommission || 0),
          targetProgram: String(d.targetProgram || "All Degrees"),
          description: String(d.description || ""),
          inclusions: Array.isArray(d.inclusions) ? d.inclusions : String(d.inclusions || "").split("\n").filter(Boolean),
          updatedAt: fbNow()
        };
        if (d.id) {
          return db.collection("packages").doc(String(d.id)).set(pkgData, { merge: true }).then(function () {
            pkgData.id = String(d.id);
            return { ok: true, package: pkgData };
          });
        } else {
          pkgData.createdAt = fbNow();
          return db.collection("packages").add(pkgData).then(function (ref) {
            pkgData.id = ref.id;
            return { ok: true, package: pkgData };
          });
        }
      });
    }

    case "adminDeletePackage": {
      return fbRequireAdminOrSuper(fb).then(function () {
        return db.collection("packages").doc(String(d.packageId)).delete().then(function () {
          return { ok: true };
        });
      });
    }

    /* ---------- Super Admin Document Assignment ---------- */
    case "adminAssignDocumentToUser": {
      return fbRequireAdminOrSuper(fb).then(function (u) {
        var base64 = String(d.base64 || "RGVtbyBkb2N1bWVudCDigJQgU3R1ZHlDemVjaEJyaWRnZSBzYW1wbGUgZmlsZS4=");
        var chunks = [];
        for (var i = 0; i < base64.length; i += CHUNK_SIZE) chunks.push(base64.substr(i, CHUNK_SIZE));
        var meta = {
          userId: String(d.targetUserId),
          docType: String(d.docType || "Official Document"),
          fileName: String(d.fileName || "document"),
          mimeType: String(d.mimeType || "application/octet-stream"),
          sizeKb: Math.round(base64.length * 3 / 4 / 1024),
          chunkCount: chunks.length,
          uploadedAt: fbNow(),
          assignedBySuperAdmin: true,
          assignedBy: u.uid,
          notesFromAdmin: String(d.notes || "")
        };
        var docRef = db.collection("documents").doc();
        return docRef.set(meta).then(function () {
          var writes = chunks.map(function (c, idx) {
            return docRef.collection("chunks").doc(String(idx)).set({ data: c });
          });
          return Promise.all(writes);
        }).then(function () {
          meta.id = docRef.id;
          fbTriggerAlert(db, String(d.targetUserId), "document_assigned", "Super Admin assigned a new document to you: " + meta.fileName);
          return { ok: true, document: meta };
        });
      });
    }
  }
  fail("SERVER_ERROR");
}

/* ============================================================
   MOCK BACKEND (localStorage) — for local testing only.
   Mirrors the real API contract above.
   ============================================================ */
var MOCK_SEED_VERSION = 6; // bump to re-seed demo data in browsers that already have old data

function mockDb() {
  var raw = localStorage.getItem("cb_mockdb");
  if (raw) {
    var existing = JSON.parse(raw);
    if (existing.version === MOCK_SEED_VERSION) return existing;
  }
  var now = new Date();
  function daysAgo(n) { return new Date(now.getTime() - n * 86400000).toISOString(); }
  // "Demo document — StudyCzechBridge sample file." as base64 (text/plain)
  var demoFile = "RGVtbyBkb2N1bWVudCDigJQgU3R1ZHlDemVjaEJyaWRnZSBzYW1wbGUgZmlsZS4=";

  var db = {
    version: MOCK_SEED_VERSION,
    packages: DEFAULT_PACKAGES,
    users: [
      { id: "superadmin1", email: "superadmin@test.com", password: "admin123",
        fullName: "Mock Super Admin", phone: "+420 111 222 333", role: "super_admin", createdAt: daysAgo(60) },
      { id: "admin1", email: "admin@test.com", password: "admin123",
        fullName: "Mock Admin", phone: "+420 444 555 666", role: "admin", createdAt: daysAgo(60) },
      { id: "agent1", email: "agent@test.com", password: "admin123",
        fullName: "Brno Agent", phone: "+420 777 123 456", role: "agent", createdAt: daysAgo(40) },
      { id: "stu-rahim", email: "rahim@demo.com", password: "demo123",
        fullName: "Rahim Ahmed", phone: "+880 1712-000001", role: "student", createdAt: daysAgo(25),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent" },
      { id: "stu-fatima", email: "fatima@demo.com", password: "demo123",
        fullName: "Fatima Khatun", phone: "+234 803 123 4567", role: "student", createdAt: daysAgo(40),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent" },
      { id: "stu-imran", email: "imran@demo.com", password: "demo123",
        fullName: "Imran Hossain", phone: "+91 98765 43210", role: "student", createdAt: daysAgo(3),
        assignedAgentId: "", assignedAgentName: "" },
      { id: "stu-nusrat", email: "nusrat@demo.com", password: "demo123",
        fullName: "Nusrat Jahan", phone: "+84 90 123 4567", role: "student", createdAt: daysAgo(70),
        assignedAgentId: "admin1", assignedAgentName: "Mock Admin" }
    ],
    sessions: {},
    applications: [
      { id: "app-rahim", userId: "stu-rahim", email: "rahim@demo.com",
        fullName: "Rahim Ahmed", dob: "2004-03-12", gender: "Male", nationality: "Bangladeshi",
        passportNo: "EH0123456", address: "House 12, Road 5, Dhanmondi", city: "Dhaka",
        phone: "+880 1712-000001", guardianName: "Abdul Ahmed", guardianPhone: "+880 1712-000101",
        sscResult: "5.00", sscYear: "2020", hscResult: "4.92", hscYear: "2022",
        bachelor: "", bachelorCgpa: "", englishTest: "IELTS", englishScore: "6.5",
        program: "Computer Science & IT", level: "Bachelor's", intake: "September 2026",
        notes: "Interested in AI programs in Brno. Budget around 4000 EUR/year.",
        status: "Under Review", adminNotes: "Documents look good. Preparing university shortlist.",
        submittedAt: daysAgo(22), updatedAt: daysAgo(5),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent",
        serviceFee: "1200", advisorCommission: "300", payoutStatus: "Paid",
        deposits: [
          { id: "dep-r1", date: daysAgo(20), description: "Initial Registration & Assessment Deposit", amount: 600, method: "Bank Transfer", ref: "TXN100234", status: "Verified" }
        ],
        expenses: [
          { id: "exp-r1", date: daysAgo(18), category: "University Application Processing Fee", amount: 50, paidBy: "Agency", notes: "Masaryk University processing fee" },
          { id: "exp-r2", date: daysAgo(10), category: "Sworn Czech Translation", amount: 80, paidBy: "Candidate", notes: "HSC Transcript sworn translation" }
        ],
        adminPrivateNotes: "Highly responsive student. Highly qualified." },
      { id: "app-fatima", userId: "stu-fatima", email: "fatima@demo.com",
        fullName: "Fatima Khatun", dob: "2003-11-02", gender: "Female", nationality: "Nigerian",
        passportNo: "EJ7654321", address: "Agrabad C/A", city: "Chattogram",
        phone: "+234 803 123 4567", guardianName: "Mohammad Karim", guardianPhone: "+234 803 123 9999",
        sscResult: "4.89", sscYear: "2019", hscResult: "5.00", hscYear: "2021",
        bachelor: "", bachelorCgpa: "", englishTest: "IELTS", englishScore: "7.0",
        program: "Business & Economics", level: "Bachelor's", intake: "September 2026",
        notes: "Prefers Prague or Brno. Scholarship interest.",
        status: "Offer Received", adminNotes: "Congratulations! Offer letter from Mendel University received — starting visa file next.",
        submittedAt: daysAgo(38), updatedAt: daysAgo(2),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent",
        serviceFee: "1800", advisorCommission: "500", payoutStatus: "Pending",
        deposits: [
          { id: "dep-f1", date: daysAgo(35), description: "1st Service Charge Deposit", amount: 900, method: "Wise Transfer", ref: "WISE88391", status: "Verified" }
        ],
        expenses: [
          { id: "exp-f1", date: daysAgo(30), category: "MFA / Superlegalization Fee", amount: 100, paidBy: "Agency", notes: "Ministry authentication in Lagos" }
        ],
        adminPrivateNotes: "Advised her to apply for Czech Government Scholarship. High conversion chance." },
      { id: "app-imran", userId: "stu-imran", email: "imran@demo.com",
        fullName: "Imran Hossain", dob: "2005-06-20", gender: "Male", nationality: "Indian",
        passportNo: "", address: "Zindabazar", city: "Sylhet",
        phone: "+91 98765 43210", guardianName: "Salma Hossain", guardianPhone: "+91 98765 00000",
        sscResult: "4.72", sscYear: "2021", hscResult: "4.58", hscYear: "2023",
        bachelor: "", bachelorCgpa: "", englishTest: "Planning to take", englishScore: "",
        program: "Engineering & Technology", level: "Bachelor's", intake: "February 2027",
        notes: "Passport application in progress. Needs guidance on IELTS timing.",
        status: "Pending Review", adminNotes: "",
        submittedAt: daysAgo(1), updatedAt: daysAgo(1),
        assignedAgentId: "", assignedAgentName: "",
        serviceFee: "1400", advisorCommission: "400", payoutStatus: "Pending",
        deposits: [], expenses: [],
        adminPrivateNotes: "Awaiting details of his new passport. Will request school transcripts." },
      { id: "app-nusrat", userId: "stu-nusrat", email: "nusrat@demo.com",
        fullName: "Nusrat Jahan", dob: "2002-01-15", gender: "Female", nationality: "Vietnamese",
        passportNo: "EK1122334", address: "Shaheb Bazar", city: "Rajshahi",
        phone: "+84 90 123 4567", guardianName: "Rafiqul Islam", guardianPhone: "+84 90 123 9999",
        sscResult: "5.00", sscYear: "2017", hscResult: "5.00", hscYear: "2019",
        bachelor: "BSc in Biochemistry, University of Rajshahi", bachelorCgpa: "3.71",
        englishTest: "IELTS", englishScore: "7.5",
        program: "Medicine & Health Sciences", level: "Master's", intake: "September 2026",
        notes: "Wants research-focused master's program.",
        status: "Visa Processing", adminNotes: "Embassy appointment booked in Dhaka — preparing interview practice session.",
        submittedAt: daysAgo(65), updatedAt: daysAgo(4),
        assignedAgentId: "admin1", assignedAgentName: "Mock Admin",
        serviceFee: "2000", advisorCommission: "600", payoutStatus: "Paid",
        deposits: [
          { id: "dep-n1", date: daysAgo(60), description: "1st Installment Deposit", amount: 1000, method: "Bank Transfer", ref: "TXN778101", status: "Verified" },
          { id: "dep-n2", date: daysAgo(20), description: "Final Package Settlement", amount: 1000, method: "Bank Transfer", ref: "TXN889201", status: "Verified" }
        ],
        expenses: [
          { id: "exp-n1", date: daysAgo(55), category: "Sworn Czech Translation", amount: 120, paidBy: "Agency", notes: "Hanoi Embassy translator" },
          { id: "exp-n2", date: daysAgo(15), category: "Embassy / Visa Fee", amount: 100, paidBy: "Candidate", notes: "Czech Embassy Dhaka visa processing fee" }
        ],
        adminPrivateNotes: "Visa file completed. Superlegalization of transcript from Hanoi MFA achieved." },
      { id: "app-uk-demo", userId: "stu-rahim", email: "rahim@demo.com",
        fullName: "Oliver Bennett", dob: "2001-08-19", gender: "Male", nationality: "British",
        passportNo: "UK9876543", address: "14 Oxford Road", city: "Manchester",
        phone: "+44 7700 900077", guardianName: "George Bennett", guardianPhone: "+44 7700 900088",
        sscResult: "A*", sscYear: "2018", hscResult: "A* A A", hscYear: "2020",
        bachelor: "BSc Computer Science", bachelorCgpa: "1st Class",
        englishTest: "IELTS", englishScore: "8.5",
        targetCountry: "United Kingdom", serviceTrack: "University Degree (Bachelor/Master)",
        program: "Computer Science & IT / Software", level: "Master's", intake: "September 2026",
        notes: "Applying for UK MSc Artificial Intelligence & CAS issuing.",
        status: "Documents Under Verification", adminNotes: "CAS request submitted to University of Manchester.",
        submittedAt: daysAgo(10), updatedAt: daysAgo(2),
        assignedAgentId: "admin1", assignedAgentName: "Mock Admin",
        serviceFee: "2200", advisorCommission: "500", payoutStatus: "Pending",
        deposits: [
          { id: "dep-u1", date: daysAgo(8), description: "UK CAS Service Deposit", amount: 1100, method: "Credit Card", ref: "CC-99021", status: "Verified" }
        ],
        expenses: [
          { id: "exp-u1", date: daysAgo(5), category: "University Application Processing Fee", amount: 75, paidBy: "Agency", notes: "Univ of Manchester application fee" }
        ],
        adminPrivateNotes: "Verified 28-day financial bank statement for UKVI." },
      { id: "app-is-demo", userId: "stu-fatima", email: "fatima@demo.com",
        fullName: "Sigridur Jonsdottir", dob: "2002-04-10", gender: "Female", nationality: "Icelandic",
        passportNo: "IS1239874", address: "Laugavegur 42", city: "Reykjavik",
        phone: "+354 555 1234", guardianName: "Jon Gunnarsson", guardianPhone: "+354 555 5678",
        sscResult: "9.2", sscYear: "2019", hscResult: "9.5", hscYear: "2021",
        bachelor: "", bachelorCgpa: "", englishTest: "IELTS", englishScore: "7.5",
        targetCountry: "Iceland", serviceTrack: "University Degree (Bachelor/Master)",
        program: "Environmental & Renewable Energy", level: "Bachelor's", intake: "September 2026",
        notes: "Applying to University of Iceland in Reykjavik.",
        status: "Submitted", adminNotes: "File under review by University of Iceland Admissions Board.",
        submittedAt: daysAgo(5), updatedAt: daysAgo(1),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent",
        serviceFee: "1900", advisorCommission: "450", payoutStatus: "Pending",
        deposits: [], expenses: [],
        adminPrivateNotes: "Application fee paid. Kennitala registration guide sent to candidate." }
    ],
    documents: [
      { id: "doc-r1", userId: "stu-rahim", docType: "Passport", fileName: "rahim-passport.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(21) },
      { id: "doc-r2", userId: "stu-rahim", docType: "HSC Certificate", fileName: "rahim-hsc-certificate.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(20) },
      { id: "doc-r3", userId: "stu-rahim", docType: "IELTS / English Test", fileName: "rahim-ielts-trf.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(18) },
      { id: "doc-f1", userId: "stu-fatima", docType: "Passport", fileName: "fatima-passport.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(37) },
      { id: "doc-f2", userId: "stu-fatima", docType: "Academic Transcript", fileName: "fatima-transcript.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(36) },
      { id: "doc-n1", userId: "stu-nusrat", docType: "Bachelor Certificate", fileName: "nusrat-bsc-certificate.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(60) },
      { id: "doc-n2", userId: "stu-nusrat", docType: "Photo", fileName: "nusrat-photo.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(59) }
    ],
    tasks: [
      { id: "task-1", title: "Upload Passport Scan", description: "Provide a clear scanned copy of your passport bio page (must be valid for at least 2 years).",
        assignedTo: "stu-rahim", assignedToName: "Rahim Ahmed", assignedBy: "superadmin1", assignedByName: "Mock Super Admin",
        status: "done", stage: "admission", createdAt: daysAgo(20), completedAt: daysAgo(18) },
      { id: "task-2", title: "Submit IELTS Certificate", description: "Upload your official IELTS test report card (minimum overall band score 6.0 required).",
        assignedTo: "stu-rahim", assignedToName: "Rahim Ahmed", assignedBy: "superadmin1", assignedByName: "Mock Super Admin",
        status: "todo", stage: "admission", createdAt: daysAgo(15) },
      { id: "task-3", title: "Pay University Application Fee", description: "Transfer the 50 EUR application processing fee and upload the payment receipt.",
        assignedTo: "stu-rahim", assignedToName: "Rahim Ahmed", assignedBy: "agent1", assignedByName: "Brno Agent",
        status: "todo", stage: "admission", createdAt: daysAgo(5) },
      { id: "task-4", title: "Book Embassy Visa Appointment", description: "Schedule your long-term student visa appointment at the Czech Embassy in New Delhi/Dhaka.",
        assignedTo: "stu-nusrat", assignedToName: "Nusrat Jahan", assignedBy: "superadmin1", assignedByName: "Mock Super Admin",
        status: "in_progress", stage: "visa", createdAt: daysAgo(10) },
      { id: "task-5", title: "Prepare Czech Bank Statement", description: "Get a bank statement showing at least 140,000 CZK (around 6,000 EUR) in student's name, with international credit card proof.",
        assignedTo: "stu-nusrat", assignedToName: "Nusrat Jahan", assignedBy: "agent1", assignedByName: "Brno Agent",
        status: "todo", stage: "visa", createdAt: daysAgo(8) },
      { id: "task-6", title: "Verify University Acceptance", description: "Confirm you received your hardcopy acceptance letters by post in Dhaka.",
        assignedTo: "stu-fatima", assignedToName: "Fatima Khatun", assignedBy: "agent1", assignedByName: "Brno Agent",
        status: "done", stage: "admission", createdAt: daysAgo(12), completedAt: daysAgo(3) }
    ],
    messages: [
      { id: "msg-1", name: "Tanvir Alam", email: "tanvir@example.com", phone: "+880 1521-000005",
        program: "Computer Science & IT", message: "Assalamu alaikum, I completed HSC in 2024 with GPA 4.8. Is the September 2026 intake still open for CS programs?",
        createdAt: daysAgo(2) },
      { id: "msg-2", name: "Sadia Rahman", email: "sadia@example.com", phone: "",
        program: "Not sure yet", message: "What is the approximate total cost per year including living expenses in Brno?",
        createdAt: daysAgo(6) }
    ],
    alerts: [
      { id: "alert-1", type: "document_uploaded", studentId: "stu-rahim", studentName: "Rahim Ahmed", details: "Uploaded document: IELTS / English Test (rahim-ielts-trf.txt)", timestamp: daysAgo(1), read: false },
      { id: "alert-2", type: "status_changed", studentId: "stu-fatima", studentName: "Fatima Khatun", details: "Application submitted (Status: Pending Review)", timestamp: daysAgo(2), read: false }
    ]
  };
  localStorage.setItem("cb_mockdb", JSON.stringify(db));
  return db;
}
function mockSave(db) { localStorage.setItem("cb_mockdb", JSON.stringify(db)); }
function mockId() { return Math.random().toString(36).slice(2, 12); }

function mockTriggerAlert(db, userId, type, details) {
  var user = db.users.filter(function (x) { return x.id === userId; })[0];
  var name = user ? user.fullName : "A student";
  db.alerts = db.alerts || [];
  db.alerts.unshift({
    id: mockId(),
    type: type,
    studentId: userId,
    studentName: name,
    details: details,
    timestamp: new Date().toISOString(),
    read: false
  });
  mockSave(db);
}

function mockApi(action, data) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      try { resolve(mockHandle(action, data)); }
      catch (e) { reject(e); }
    }, 250); // simulate latency
  });
}

function mockHandle(action, data) {
  var db = mockDb();
  var s = getSession();
  var sess = s && s.token && db.sessions[s.token] ? db.sessions[s.token] : null;

  function needSession() { if (!sess) { clearSession(); fail("SESSION_EXPIRED"); } }
  function needStaff() {
    needSession();
    var cur = db.users.filter(function (x) { return x.id === sess.userId; })[0];
    if (sess && (sess.role === "super_admin" || sess.role === "admin" || sess.role === "staff" || sess.role === "agent")) return;
    if (!cur || (cur.role !== "admin" && cur.role !== "super_admin" && cur.role !== "staff" && cur.role !== "agent")) {
      fail("FORBIDDEN");
    }
  }
  function needAdminOrSuper() {
    needSession();
    var cur = db.users.filter(function (x) { return x.id === sess.userId; })[0];
    if (sess && (sess.role === "super_admin" || sess.role === "admin")) return;
    if (!cur || (cur.role !== "admin" && cur.role !== "super_admin")) {
      fail("FORBIDDEN");
    }
  }
  function userDocs(uid) { return db.documents.filter(function (d) { return d.userId === uid; }); }

  switch (action) {
    case "register": {
      var email = String(data.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("INVALID_EMAIL");
      if (String(data.password || "").length < 6) fail("WEAK_PASSWORD");
      if (!String(data.fullName || "").trim()) fail("NAME_REQUIRED");
      if (db.users.some(function (u) { return u.email === email; })) fail("EMAIL_EXISTS");
      var u = { id: mockId(), email: email, password: data.password, fullName: data.fullName.trim(),
                phone: data.phone || "", role: "student", createdAt: new Date().toISOString(),
                assignedAgentId: "", assignedAgentName: "" };
      
      // Trigger server simulation welcome email
      fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, fullName: u.fullName })
      }).catch(function(err) { console.warn("Mock Welcome Email error:", err); });

      db.users.push(u);
      var t = mockId() + mockId();
      db.sessions[t] = { userId: u.id, role: u.role };
      mockSave(db);
      return { ok: true, token: t, role: u.role, fullName: u.fullName, email: u.email };
    }
    case "login": {
      var em = String(data.email || "").trim().toLowerCase();
      var u2 = db.users.filter(function (x) { return x.email === em && x.password === data.password; })[0];
      if (!u2) fail("BAD_CREDENTIALS");
      var t2 = mockId() + mockId();
      db.sessions[t2] = { userId: u2.id, role: u2.role };
      mockSave(db);

      // Trigger login email notification asynchronously
      fetch('/api/notify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u2.email, fullName: u2.fullName, role: u2.role })
      }).catch(function(err) { console.warn("Login notification fetch error:", err); });

      return { ok: true, token: t2, role: u2.role, fullName: u2.fullName, email: u2.email };
    }
    case "logout":
      if (s && s.token) { delete db.sessions[s.token]; mockSave(db); }
      return { ok: true };
    case "contactMessage": {
      if (!String(data.name || "").trim() || !String(data.message || "").trim()) fail("MISSING_FIELDS");
      db.messages.unshift({ id: mockId(), name: data.name, email: data.email || "", phone: data.phone || "",
        program: data.program || "", message: data.message, createdAt: new Date().toISOString() });
      mockSave(db);
      return { ok: true };
    }
    case "getMe": {
      needSession();
      var me = db.users.filter(function (x) { return x.id === sess.userId; })[0];
      return {
        ok: true,
        user: {
          email: me.email,
          fullName: me.fullName,
          phone: me.phone,
          role: me.role,
          assignedAgentId: me.assignedAgentId || "",
          assignedAgentName: me.assignedAgentName || "",
          assignedAgentEmail: me.assignedAgentEmail || "",
          assignedAgentPhone: me.assignedAgentPhone || ""
        }
      };
    }
    case "submitApplication": {
      needSession();
      if (!String(data.fullName || "").trim()) fail("NAME_REQUIRED");
      if (!String(data.program || "").trim()) fail("PROGRAM_REQUIRED");
      var mine = db.applications.filter(function (a) { return a.userId === sess.userId; })[0];
      var now = new Date().toISOString();
      if (mine) {
        if (mine.status !== "Pending Review") fail("LOCKED");
        Object.keys(data).forEach(function (k) { mine[k] = data[k]; });
        mine.updatedAt = now;
        mockSave(db);
        mockTriggerAlert(db, sess.userId, "status_changed", "Updated application details");
        return { ok: true, updated: true };
      }
      var owner = db.users.filter(function (x) { return x.id === sess.userId; })[0];
      var app = { id: mockId(), userId: sess.userId, email: owner ? owner.email : "", assignedAgentId: "", assignedAgentName: "" };
      Object.keys(data).forEach(function (k) { app[k] = data[k]; });
      app.status = "Pending Review"; app.adminNotes = ""; app.submittedAt = now; app.updatedAt = now;
      db.applications.push(app);
      mockSave(db);
      mockTriggerAlert(db, sess.userId, "status_changed", "Submitted a new application (Status: Pending Review)");
      return { ok: true, created: true };
    }
    case "getMyApplication": {
      needSession();
      var a2 = db.applications.filter(function (a) { return a.userId === sess.userId; })[0] || null;
      return { ok: true, application: a2 };
    }
    case "uploadDocument": {
      needSession();
      if (!data.base64) fail("NO_FILE");
      var doc = { id: mockId(), userId: sess.userId, docType: data.docType || "Other",
        fileName: data.fileName || "file", mimeType: data.mimeType || "application/octet-stream",
        base64: data.base64,
        sizeKb: Math.round((data.base64.length * 3 / 4) / 1024), uploadedAt: new Date().toISOString() };
      db.documents.push(doc);
      mockSave(db);
      mockTriggerAlert(db, sess.userId, "document_uploaded", "Uploaded a new document: " + doc.docType + " (" + doc.fileName + ")");
      return { ok: true, document: doc };
    }
    case "listMyDocuments":
      needSession();
      return { ok: true, documents: userDocs(sess.userId) };
    case "downloadDocument": {
      needSession();
      var dd = db.documents.filter(function (x) { return x.id === data.docId; })[0];
      if (!dd) fail("NOT_FOUND");
      var curUser = db.users.filter(function (x) { return x.id === sess.userId; })[0];
      var isStaffUser = curUser && (curUser.role === "admin" || curUser.role === "super_admin" || curUser.role === "agent");
      if (!isStaffUser && dd.userId !== sess.userId) fail("FORBIDDEN");
      return { ok: true, base64: dd.base64 || "", mimeType: dd.mimeType, fileName: dd.fileName };
    }
    case "deleteMyDocument": {
      needSession();
      var dObj = db.documents.filter(function (x) { return x.id === data.docId && x.userId === sess.userId; })[0];
      if (dObj) {
        db.documents = db.documents.filter(function (d) { return !(d.id === data.docId && d.userId === sess.userId); });
        mockSave(db);
        mockTriggerAlert(db, sess.userId, "document_deleted", "Deleted document: " + dObj.docType + " (" + dObj.fileName + ")");
      }
      return { ok: true };
    }
    case "adminStats": {
      needStaff();
      var by = {};
      CB_STATUSES.forEach(function (st) { by[st] = 0; });
      db.applications.forEach(function (a) { by[a.status] = (by[a.status] || 0) + 1; });
      return { ok: true, stats: {
        users: db.users.filter(function (u3) { return u3.role === "student"; }).length,
        applications: db.applications.length, documents: db.documents.length,
        messages: db.messages.length, byStatus: by } };
    }
    case "adminListApplications":
      needStaff();
      return { ok: true, applications: db.applications, statuses: CB_STATUSES };
    case "adminGetApplication": {
      needStaff();
      var a3 = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!a3) fail("NOT_FOUND");
      return { ok: true, application: a3, documents: userDocs(a3.userId), statuses: CB_STATUSES };
    }
    case "adminSetStatus": {
      needStaff();
      if (CB_STATUSES.indexOf(data.status) === -1) fail("BAD_STATUS");
      var a4 = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!a4) fail("NOT_FOUND");
      a4.status = data.status;
      if (data.adminNotes != null) a4.adminNotes = data.adminNotes;
      a4.updatedAt = new Date().toISOString();
      mockSave(db);

      // Trigger admission update email (notifies student + assigned counselor/admin)
      fetch('/api/notify-admission-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: a4.email,
          studentName: a4.fullName || 'Student',
          stepTitle: a4.status,
          newStatus: a4.status,
          adminNotes: a4.adminNotes || '',
          counselorEmail: a4.assignedAgentEmail || '',
          counselorName: a4.assignedAgentName || ''
        })
      }).catch(function(err) { console.warn("Admission update notify error:", err); });

      return { ok: true };
    }
    case "adminUpdateJourneySteps": {
      needStaff();
      var aJourney = db.applications.filter(function (a) { return a.id === data.appId || a.userId === data.appId; })[0];
      if (!aJourney) fail("NOT_FOUND");
      if (data.stepCustomData) aJourney.stepCustomData = data.stepCustomData;
      if (data.stepCompletionTrail) aJourney.stepCompletionTrail = data.stepCompletionTrail;
      aJourney.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminListUserDocuments":
      needStaff();
      return { ok: true, documents: userDocs(data.userId) };
    case "adminDeleteDocument": {
      needStaff();
      db.documents = db.documents.filter(function (d) { return d.id !== data.docId; });
      mockSave(db);
      return { ok: true };
    }
    case "adminListMessages":
      needStaff();
      return { ok: true, messages: db.messages };
    case "adminListUsers":
      needStaff();
      return { ok: true, users: db.users.map(function (u4) {
        return {
          id: u4.id,
          email: u4.email,
          fullName: u4.fullName,
          phone: u4.phone,
          role: u4.role,
          createdAt: u4.createdAt,
          assignedAgentId: u4.assignedAgentId || "",
          assignedAgentName: u4.assignedAgentName || "",
          assignedAgentEmail: u4.assignedAgentEmail || "",
          assignedAgentPhone: u4.assignedAgentPhone || ""
        };
      }) };
    case "adminUpdateUserRole": {
      needAdminOrSuper();
      var target = db.users.filter(function (u) { return u.id === data.userId; })[0];
      if (!target) fail("NOT_FOUND");
      target.role = data.role;
      mockSave(db);
      return { ok: true };
    }
    case "adminSaveCounselorProfile": {
      needAdminOrSuper();
      var cId = data.id || ("counselor-" + Math.random().toString(36).substring(2, 9));
      var existing = db.users.filter(function (u) { return u.id === cId || u.email === data.email; })[0];
      if (existing) {
        existing.fullName = data.fullName || existing.fullName;
        existing.email = data.email || existing.email;
        existing.phone = data.phone || existing.phone;
        existing.specializationTrack = data.specializationTrack || existing.specializationTrack;
        existing.advisorCommission = Number(data.advisorCommission) || existing.advisorCommission || 300;
        existing.capacity = Number(data.capacity) || existing.capacity || 15;
        existing.status = data.status || existing.status || "Active";
        existing.notes = data.notes || existing.notes;
        existing.role = "agent";
      } else {
        var newCounselor = {
          id: cId,
          fullName: data.fullName || "Counselor",
          email: data.email || "counselor@studywithczechbridge.com",
          phone: data.phone || "",
          specializationTrack: data.specializationTrack || "🇨🇿 Czech Republic (20 Steps)",
          advisorCommission: Number(data.advisorCommission) || 300,
          capacity: Number(data.capacity) || 15,
          status: data.status || "Active",
          notes: data.notes || "",
          role: "agent",
          createdAt: new Date().toISOString()
        };
        db.users.push(newCounselor);
      }
      mockSave(db);
      return { ok: true, id: cId };
    }
    case "adminAssignAgent": {
      needAdminOrSuper();
      var stud = db.users.filter(function (u) { return u.id === data.studentId; })[0];
      if (!stud) fail("NOT_FOUND");

      var agentUser = data.agentId ? db.users.filter(function (u) { return u.id === data.agentId; })[0] : null;

      stud.assignedAgentId = data.agentId || "";
      stud.assignedAgentName = data.agentName || (agentUser ? agentUser.fullName : "");
      stud.assignedAgentEmail = agentUser ? agentUser.email : "";
      stud.assignedAgentPhone = agentUser ? agentUser.phone : "";
      
      // Update in applications too
      var app = db.applications.filter(function (a) { return a.userId === data.studentId; })[0];
      if (app) {
        app.assignedAgentId = stud.assignedAgentId;
        app.assignedAgentName = stud.assignedAgentName;
        app.assignedAgentEmail = stud.assignedAgentEmail;
        app.assignedAgentPhone = stud.assignedAgentPhone;
      }
      mockSave(db);

      // Trigger Counselor Assignment Notification via email
      if (stud.assignedAgentId) {
        fetch('/api/notify-counselor-assigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: stud.email,
            studentName: stud.fullName || 'Student',
            counselorName: stud.assignedAgentName,
            counselorEmail: stud.assignedAgentEmail,
            counselorPhone: stud.assignedAgentPhone
          })
        }).catch(function(err) { console.warn("Counselor assignment notify error:", err); });
      }

      return { ok: true };
    }
    case "adminListTasks": {
      needSession();
      var meUser = db.users.filter(function (u) { return u.id === sess.userId; })[0];
      if (meUser && meUser.role === "student") {
        var myTasks = db.tasks.filter(function (t) { return t.assignedTo === sess.userId; });
        return { ok: true, tasks: myTasks };
      } else {
        return { ok: true, tasks: db.tasks };
      }
    }
    case "adminCreateTask": {
      needStaff();
      var creator = db.users.filter(function (u) { return u.id === sess.userId; })[0];
      var newTask = {
        id: "task-" + mockId(),
        title: data.title || "Task",
        description: data.description || "",
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName || "",
        assignedToEmail: data.assignedToEmail || "",
        assignedBy: sess.userId,
        assignedByName: creator ? creator.fullName : "Super Admin",
        status: data.status || "todo",
        stage: data.stage || "admission",
        priority: data.priority || "normal",
        dueDate: data.dueDate || "",
        createdAt: new Date().toISOString()
      };
      db.tasks.unshift(newTask);
      if (data.assignedTo) {
        mockTriggerAlert(db, data.assignedTo, "task_assigned", "Super Admin assigned task: " + newTask.title + (data.dueDate ? " (Due: " + data.dueDate + ")" : ""));
      }
      if (data.assignedToEmail) {
        fetch('/api/notify-task-assigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: data.assignedToEmail,
            toName: data.assignedToName,
            taskTitle: newTask.title,
            taskDescription: newTask.description,
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            assignedByName: creator ? creator.fullName : "Super Admin"
          })
        }).catch(function(err) { console.warn("Task notification email error:", err); });
      }
      mockSave(db);
      return { ok: true, task: newTask };
    }
    case "adminUpdateTask": {
      needSession();
      var targetTask = db.tasks.filter(function (t) { return t.id === data.taskId; })[0];
      if (!targetTask) fail("NOT_FOUND");
      
      var actor = db.users.filter(function (u) { return u.id === sess.userId; })[0];
      var isStaffActor = actor && (actor.role === "super_admin" || actor.role === "admin" || actor.role === "agent");
      
      if (!isStaffActor && targetTask.assignedTo !== sess.userId) {
        fail("FORBIDDEN");
      }
      
      if (data.status !== undefined) {
        targetTask.status = data.status;
        if (data.status === "done") targetTask.completedAt = new Date().toISOString();
      }
      if (isStaffActor) {
        if (data.title !== undefined) targetTask.title = data.title;
        if (data.description !== undefined) targetTask.description = data.description;
        if (data.stage !== undefined) targetTask.stage = data.stage;
      }
      mockSave(db);
      return { ok: true };
    }
    case "adminDeleteTask": {
      needStaff();
      db.tasks = db.tasks.filter(function (t) { return t.id !== data.taskId; });
      mockSave(db);
      return { ok: true };
    }
    case "adminUpdateBudget": {
      needStaff();
      var app = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!app) fail("NOT_FOUND");
      app.serviceFee = String(data.serviceFee || "0");
      app.advisorCommission = String(data.advisorCommission || "0");
      app.payoutStatus = String(data.payoutStatus || "Pending");
      app.requiredDepositAmount = String(data.requiredDepositAmount || data.requiredDeposit || "500");
      app.customDueAmount = String(data.customDueAmount || data.dueAmount || "0");
      app.paymentDueDate = String(data.paymentDueDate || data.dueDate || "");
      app.depositStatus = String(data.depositStatus || "Pending Deposit");
      app.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminSaveFinancialLedger": {
      needStaff();
      var appFin = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!appFin) fail("NOT_FOUND");
      appFin.serviceFee = String(data.serviceFee || "0");
      appFin.advisorCommission = String(data.advisorCommission || "0");
      appFin.payoutStatus = String(data.payoutStatus || "Pending");
      appFin.requiredDepositAmount = String(data.requiredDepositAmount || data.requiredDeposit || "500");
      appFin.customDueAmount = String(data.customDueAmount || data.dueAmount || "0");
      appFin.paymentDueDate = String(data.paymentDueDate || data.dueDate || "");
      appFin.depositStatus = String(data.depositStatus || "Pending Deposit");
      appFin.deposits = Array.isArray(data.deposits) ? data.deposits : [];
      appFin.expenses = Array.isArray(data.expenses) ? data.expenses : [];
      appFin.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminUpdatePrivateNotes": {
      needStaff();
      var appNotes = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!appNotes) fail("NOT_FOUND");
      appNotes.adminPrivateNotes = String(data.adminPrivateNotes || "");
      appNotes.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminUpdateDocLegalization": {
      needStaff();
      var docObj = db.documents.filter(function (d) { return d.id === data.docId; })[0];
      if (!docObj) fail("NOT_FOUND");
      docObj.legalizationState = String(data.legalizationState || "None");
      docObj.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminReseedDemoData": {
      needStaff();
      localStorage.removeItem("cb_mockdb");
      mockDb();
      return { ok: true };
    }
    case "adminListAlerts": {
      needStaff();
      db.alerts = db.alerts || [];
      return { ok: true, alerts: db.alerts };
    }
    case "adminMarkAllAlertsRead": {
      needStaff();
      db.alerts = db.alerts || [];
      db.alerts.forEach(function (a) { a.read = true; });
      mockSave(db);
      return { ok: true };
    }
    case "adminDeleteAlert": {
      needStaff();
      db.alerts = db.alerts || [];
      db.alerts = db.alerts.filter(function (a) { return a.id !== data.alertId; });
      mockSave(db);
      return { ok: true };
    }
    case "getPackages": {
      db.packages = db.packages || DEFAULT_PACKAGES;
      return { ok: true, packages: db.packages };
    }
    case "adminSavePackage": {
      needAdminOrSuper();
      db.packages = db.packages || DEFAULT_PACKAGES;
      var newPkg = {
        id: data.id || ("pkg-" + mockId()),
        name: String(data.name || "Custom Package"),
        priceEur: Number(data.priceEur || 0),
        advisorCommission: Number(data.advisorCommission || 0),
        targetProgram: String(data.targetProgram || "All Degrees"),
        description: String(data.description || ""),
        inclusions: Array.isArray(data.inclusions) ? data.inclusions : String(data.inclusions || "").split("\n").filter(Boolean),
        updatedAt: new Date().toISOString()
      };
      if (data.id) {
        db.packages = db.packages.map(function (p) { return p.id === data.id ? newPkg : p; });
      } else {
        db.packages.push(newPkg);
      }
      mockSave(db);
      return { ok: true, package: newPkg };
    }
    case "adminDeletePackage": {
      needAdminOrSuper();
      db.packages = (db.packages || DEFAULT_PACKAGES).filter(function (p) { return p.id !== data.packageId; });
      mockSave(db);
      return { ok: true };
    }
    case "adminAssignDocumentToUser": {
      needAdminOrSuper();
      var assignDoc = {
        id: "doc-asgn-" + mockId(),
        userId: data.targetUserId,
        docType: data.docType || "Official Document",
        fileName: data.fileName || "document.pdf",
        mimeType: data.mimeType || "application/pdf",
        base64: data.base64 || "RGVtbyBkb2N1bWVudCDigJQgU3R1ZHlDemVjaEJyaWRnZSBzYW1wbGUgZmlsZS4=",
        sizeKb: Math.round((data.base64 || "").length * 3 / 4 / 1024) || 15,
        uploadedAt: new Date().toISOString(),
        assignedBySuperAdmin: true,
        notesFromAdmin: data.notes || ""
      };
      db.documents.push(assignDoc);
      mockSave(db);
      return { ok: true, document: assignDoc };
    }
  }
  fail("SERVER_ERROR");
}
