/**
 * i18n.js
 * All user-facing strings AND the language-aware Gemini prompt templates
 * live here together, following the same pattern as the original prototype
 * (prompts are language content, not app logic).
 *
 * JSON *keys* returned by Gemini are always fixed English (see SCHEMA_NOTE)
 * so ui.js never needs to branch on language when rendering a result — only
 * the human-readable *values* inside that JSON are written in the user's
 * chosen language.
 */

import { getLang as readStoredLang, setLang as persistLang } from './storage.js';

let currentLang = 'vi';

export function initI18n() {
  currentLang = readStoredLang();
  return currentLang;
}

export function getCurrentLang() {
  return currentLang;
}

export function setCurrentLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'vi';
  persistLang(currentLang);
}

/* ----------------------------- UI strings ----------------------------- */

const TRANSLATIONS = {
  vi: {
    appName: 'MedCheck',
    appTagline: 'Trợ lý sức khỏe cá nhân',

    navProfile: 'Hồ sơ',
    navHistory: 'Lịch sử',
    navSettings: 'Cài đặt',
    toggleLanguageAria: 'Đổi ngôn ngữ',
    toggleThemeAria: 'Đổi giao diện sáng/tối',
    themeLight: 'Giao diện sáng',
    themeDark: 'Giao diện tối',

    tabFoodScan: 'Quét Nhãn',
    tabFoodManual: 'Nhập Món',
    tabPrescription: 'Đơn Thuốc',
    tabLabReport: 'Xét Nghiệm',

    btnOpenCamera: 'Mở Camera',
    btnUploadFile: 'Tải Ảnh / File',
    btnAddMore: 'Thêm Ảnh/File',
    btnCapture: 'Chụp & Phân Tích',
    btnRetake: 'Chụp Lại',
    btnAnalyze: 'Phân Tích',
    btnSave: 'Lưu',
    btnCancel: 'Hủy',
    btnClose: 'Đóng',
    btnClear: 'Xóa',
    stepperIncrease: 'Tăng',
    stepperDecrease: 'Giảm',
    btnClearAll: 'Xóa Tất Cả',
    btnDelete: 'Xóa',
    btnConfirm: 'Xác Nhận',

    foodScanIntro: 'Chụp ảnh nhãn dinh dưỡng để AI phân tích dựa trên chỉ số của bạn.',

    foodNameLabel: 'Tên món ăn / đồ uống:',
    foodNamePlaceholder: 'Ví dụ: Ốc xào bơ tỏi, Bánh quy yến mạch...',
    foodAmountLabel: 'Số lượng / Khối lượng:',
    foodUnitLabel: 'Đơn vị:',
    unitGram: 'Gam (g)',
    unitMl: 'Mililit (ml)',
    unitPiece: 'Cái / Phần',

    prescriptionIntro: 'Chụp ảnh đơn thuốc để AI đọc và giải thích công dụng, liều dùng.',
    prescriptionDisclaimerShort:
      'AI có thể đọc sai chữ viết tay. Luôn xác nhận lại với dược sĩ hoặc bác sĩ trước khi dùng thuốc.',

    labReportIntro: 'Chụp ảnh hoặc tải file (ảnh/PDF) kết quả xét nghiệm để AI giải thích.',
    labReportHint: 'Hỗ trợ ảnh JPG/PNG hoặc file PDF.',
    labDisclaimerShort:
      'Đây là giải thích tham khảo, không phải chẩn đoán y khoa. Hãy trao đổi kết quả với bác sĩ của bạn.',

    profileTitle: 'Hồ Sơ Sức Khỏe',
    profileLdlLabel: 'LDL Cholesterol (mmol/L):',
    profileHdlLabel: 'HDL Cholesterol (mmol/L):',
    profileTgLabel: 'Triglyceride (mmol/L):',
    profileAllergiesLabel: 'Dị ứng:',
    profileAllergiesPlaceholder: 'Ví dụ: hải sản, đậu phộng...',
    profileConditionsLabel: 'Bệnh nền:',
    profileConditionsPlaceholder: 'Ví dụ: tiểu đường, cao huyết áp...',
    profileMedicationsLabel: 'Thuốc đang dùng:',
    profileMedicationsPlaceholder: 'Ví dụ: Atorvastatin 20mg...',
    profileDietLabel: 'Chế độ ăn:',
    dietNone: 'Không áp dụng',
    dietKeto: 'Keto',
    dietVegan: 'Thuần chay (Vegan)',
    dietVegetarian: 'Ăn chay (Vegetarian)',
    dietLowSodium: 'Ít muối',
    dietDiabetic: 'Chế độ tiểu đường',
    profileSavedToast: 'Đã lưu hồ sơ sức khỏe.',

    settingsTitle: 'Cài Đặt',
    apiKeyLabel: 'Gemini API Key:',
    apiKeyPlaceholder: 'AIzaSy...',
    apiKeyHelp:
      'Key được lưu CHỈ trên trình duyệt của bạn (LocalStorage) và gửi thẳng đến Google. MedCheck không có máy chủ và không bao giờ nhìn thấy key của bạn.',
    apiKeyGetFree: 'Lấy Key Miễn Phí',
    modelLabel: 'Model Gemini:',
    modelHelp: 'Chỉ đổi nếu bạn biết tên model khác — mặc định phù hợp cho hầu hết trường hợp.',
    responseLanguageLabel: 'Ngôn ngữ phản hồi của AI:',
    responseLanguageHelp:
      'Ngôn ngữ Gemini dùng để phân tích và giải thích kết quả — độc lập với ngôn ngữ giao diện ở trên.',
    respLangAuto: 'Theo ngôn ngữ giao diện',
    respLangVi: 'Tiếng Việt',
    respLangEn: 'English',
    btnClearKey: 'Xóa Key Đã Lưu',
    settingsSavedToast: 'Đã lưu cài đặt.',

    historyTitle: 'Lịch Sử Quét',
    historyEmpty: 'Chưa có lịch sử nào. Kết quả phân tích sẽ được lưu tại đây.',
    historyClearConfirm: 'Xóa toàn bộ lịch sử? Không thể hoàn tác.',
    historyEntryFood: 'Nhãn thực phẩm',
    historyEntryManual: 'Món ăn',
    historyEntryPrescription: 'Đơn thuốc',
    historyEntryLab: 'Xét nghiệm',

    resultTitle: 'Kết Quả Phân Tích',
    resultDetailsHeading: 'Chi Tiết',
    resultRecommendationHeading: 'Khuyến Cáo',
    resultDisclaimerHeading: 'Lưu Ý',
    verdictSafe: 'AN TOÀN',
    verdictCaution: 'HẠN CHẾ',
    verdictDanger: 'NGUY HIỂM',
    loadingFood: 'AI đang đọc nhãn dinh dưỡng...',
    loadingPrescription: 'AI đang đọc đơn thuốc...',
    loadingLab: 'AI đang phân tích kết quả xét nghiệm...',
    loadingGeneric: 'Đang xử lý, đợi xíu nhé...',

    errNoApiKey: 'Vui lòng nhập Gemini API Key trong phần Cài Đặt trước.',
    errCameraDenied: 'Không thể truy cập camera. Vui lòng cấp quyền hoặc dùng nút tải file.',
    errFileTooLarge: 'File quá lớn (giới hạn 18MB). Vui lòng chọn ảnh/file nhỏ hơn.',
    errInvalidFileType: 'Định dạng file không được hỗ trợ ở mục này.',
    errApiGeneric: 'Có lỗi khi gọi Gemini API. Vui lòng kiểm tra lại API Key và thử lại.',
    errApiWithMessage: 'Lỗi từ Gemini: {{message}}',
    errEmptyFoodName: 'Vui lòng nhập tên món ăn.',
    errNoMedia: 'Vui lòng chụp ảnh hoặc tải file trước khi phân tích.',
    errFilesSkippedType: 'Đã bỏ qua {{names}} vì định dạng không được hỗ trợ ở mục này.',
    errFilesSkippedSize: 'Đã bỏ qua {{names}} vì vượt quá {{max}}MB mỗi file.',
    errTooManyFiles: 'Chỉ có thể chọn tối đa {{max}} ảnh/file cho một lần phân tích. Đã bỏ qua {{count}} file.',
    errTotalTooLarge:
      'Tổng dung lượng các file vượt quá {{max}}MB cho một lần phân tích. Đã bỏ qua {{count}} file.',
  },

  en: {
    appName: 'MedCheck',
    appTagline: 'Your Personal Health Assistant',

    navProfile: 'Profile',
    navHistory: 'History',
    navSettings: 'Settings',
    toggleLanguageAria: 'Switch language',
    toggleThemeAria: 'Toggle light/dark theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',

    tabFoodScan: 'Scan Label',
    tabFoodManual: 'Manual Entry',
    tabPrescription: 'Prescription',
    tabLabReport: 'Lab Report',

    btnOpenCamera: 'Open Camera',
    btnUploadFile: 'Upload Image/Files',
    btnAddMore: 'Add More Files',
    btnCapture: 'Capture & Analyze',
    btnRetake: 'Retake',
    btnAnalyze: 'Analyze',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    btnClose: 'Close',
    btnClear: 'Clear',
    stepperIncrease: 'Increase',
    stepperDecrease: 'Decrease',
    btnClearAll: 'Clear All',
    btnDelete: 'Delete',
    btnConfirm: 'Confirm',

    foodScanIntro: 'Photograph a nutrition label and let AI evaluate it against your own numbers.',

    foodNameLabel: 'Food / drink name:',
    foodNamePlaceholder: 'e.g. Garlic butter escargot, oat cookies...',
    foodAmountLabel: 'Amount / weight:',
    foodUnitLabel: 'Unit:',
    unitGram: 'Grams (g)',
    unitMl: 'Milliliters (ml)',
    unitPiece: 'Piece / Serving',

    prescriptionIntro: 'Photograph a prescription and AI will explain the medication, usage, and dosage.',
    prescriptionDisclaimerShort:
      'AI can misread handwriting. Always confirm medication and dosage with your pharmacist or doctor before taking anything.',

    labReportIntro: 'Photograph or upload (image/PDF) your lab results for a plain-language explanation.',
    labReportHint: 'Supports JPG/PNG photos or PDF files.',
    labDisclaimerShort:
      'This is an educational explanation, not a medical diagnosis. Discuss all results with your doctor.',

    profileTitle: 'Medical Profile',
    profileLdlLabel: 'LDL Cholesterol (mmol/L):',
    profileHdlLabel: 'HDL Cholesterol (mmol/L):',
    profileTgLabel: 'Triglycerides (mmol/L):',
    profileAllergiesLabel: 'Allergies:',
    profileAllergiesPlaceholder: 'e.g. shellfish, peanuts...',
    profileConditionsLabel: 'Existing conditions:',
    profileConditionsPlaceholder: 'e.g. diabetes, hypertension...',
    profileMedicationsLabel: 'Current medications:',
    profileMedicationsPlaceholder: 'e.g. Atorvastatin 20mg...',
    profileDietLabel: 'Diet pattern:',
    dietNone: 'None',
    dietKeto: 'Keto',
    dietVegan: 'Vegan',
    dietVegetarian: 'Vegetarian',
    dietLowSodium: 'Low sodium',
    dietDiabetic: 'Diabetic diet',
    profileSavedToast: 'Medical profile saved.',

    settingsTitle: 'Settings',
    apiKeyLabel: 'Gemini API Key:',
    apiKeyPlaceholder: 'AIzaSy...',
    apiKeyHelp:
      'Your key is stored ONLY in your browser (LocalStorage) and sent directly to Google. MedCheck has no server and never sees your key.',
    apiKeyGetFree: 'Get a Free Key',
    modelLabel: 'Gemini model:',
    modelHelp: 'Only change this if you know a specific model name — the default works for most cases.',
    responseLanguageLabel: 'AI response language:',
    responseLanguageHelp:
      "The language Gemini uses to analyze and explain results — independent from the interface language above.",
    respLangAuto: 'Same as interface language',
    respLangVi: 'Tiếng Việt (Vietnamese)',
    respLangEn: 'English',
    btnClearKey: 'Clear Saved Key',
    settingsSavedToast: 'Settings saved.',

    historyTitle: 'Scan History',
    historyEmpty: 'No history yet. Your analysis results will be saved here.',
    historyClearConfirm: 'Clear all history? This cannot be undone.',
    historyEntryFood: 'Food label',
    historyEntryManual: 'Food entry',
    historyEntryPrescription: 'Prescription',
    historyEntryLab: 'Lab report',

    resultTitle: 'Analysis Result',
    resultDetailsHeading: 'Details',
    resultRecommendationHeading: 'Recommendation',
    resultDisclaimerHeading: 'Note',
    verdictSafe: 'SAFE',
    verdictCaution: 'CAUTION',
    verdictDanger: 'AVOID',
    loadingFood: 'AI is reading the nutrition label...',
    loadingPrescription: 'AI is reading the prescription...',
    loadingLab: 'AI is analyzing the lab report...',
    loadingGeneric: 'Processing, one moment...',

    errNoApiKey: 'Please enter your Gemini API Key in Settings first.',
    errCameraDenied: 'Could not access the camera. Please grant permission or use the upload button.',
    errFileTooLarge: 'File too large (18MB limit). Please choose a smaller image/file.',
    errInvalidFileType: 'That file type is not supported here.',
    errApiGeneric: 'Something went wrong calling the Gemini API. Please check your API Key and try again.',
    errApiWithMessage: 'Gemini error: {{message}}',
    errEmptyFoodName: 'Please enter a food name.',
    errNoMedia: 'Please capture a photo or upload a file before analyzing.',
    errFilesSkippedType: 'Skipped {{names}} — unsupported file type here.',
    errFilesSkippedSize: 'Skipped {{names}} — over the {{max}}MB per-file limit.',
    errTooManyFiles: 'You can select up to {{max}} files per analysis. Skipped {{count}} file(s).',
    errTotalTooLarge: 'Combined file size exceeds the {{max}}MB limit per analysis. Skipped {{count}} file(s).',
  },
};

export function t(key, vars = {}) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.vi;
  let str = dict[key] ?? TRANSLATIONS.vi[key] ?? key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replaceAll(`{{${k}}}`, String(v));
  });
  return str;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
  });
  document.documentElement.lang = currentLang;
}

/* ------------------------- Gemini prompt builders ------------------------- */
/*
 * Every prompt asks for ONLY a raw JSON object matching one fixed shape, so
 * ui.js has a single rendering path regardless of mode:
 *
 * {
 *   "verdict": "green" | "yellow" | "red",
 *   "verdictLabel": string,
 *   "summary": string,
 *   "details": [ { "label": string, "value": string, "flag": "normal"|"caution"|"danger" } ],
 *   "recommendation": string,
 *   "disclaimer": string
 * }
 */

const SCHEMA_NOTE = {
  vi: `Chỉ trả lời bằng một object JSON hợp lệ (không markdown, không dùng dấu \`\`\`), đúng cấu trúc sau:
{"verdict":"green|yellow|red","verdictLabel":"nhãn ngắn gọn","summary":"tóm tắt 1-2 câu","details":[{"label":"tên mục","value":"giá trị/mô tả","flag":"normal|caution|danger"}],"recommendation":"khuyến cáo cụ thể","disclaimer":"lưu ý an toàn ngắn gọn"}
Viết toàn bộ nội dung văn bản (verdictLabel, summary, details, recommendation, disclaimer) bằng tiếng Việt. Chỉ dùng đúng 3 giá trị "green"/"yellow"/"red" cho verdict và "normal"/"caution"/"danger" cho flag.`,
  en: `Respond with ONLY a valid JSON object (no markdown, no code fences), matching exactly this shape:
{"verdict":"green|yellow|red","verdictLabel":"short label","summary":"1-2 sentence summary","details":[{"label":"item name","value":"value or description","flag":"normal|caution|danger"}],"recommendation":"specific recommendation","disclaimer":"brief safety note"}
Write all text content (verdictLabel, summary, details, recommendation, disclaimer) in English. Use only "green"/"yellow"/"red" for verdict and "normal"/"caution"/"danger" for flag.`,
};

function profileContext(lang, profile) {
  if (!profile) return '';
  const parts = [];
  if (profile.allergies) parts.push(lang === 'vi' ? `Dị ứng: ${profile.allergies}.` : `Allergies: ${profile.allergies}.`);
  if (profile.conditions) parts.push(lang === 'vi' ? `Bệnh nền: ${profile.conditions}.` : `Existing conditions: ${profile.conditions}.`);
  if (profile.medications) parts.push(lang === 'vi' ? `Thuốc đang dùng: ${profile.medications}.` : `Current medications: ${profile.medications}.`);
  if (profile.dietPattern && profile.dietPattern !== 'none') parts.push(lang === 'vi' ? `Chế độ ăn: ${profile.dietPattern}.` : `Diet pattern: ${profile.dietPattern}.`);
  return parts.join(' ');
}

const PROMPTS = {
  vi: {
    'food-scan': ({ ldl, profile }) => `Người dùng có chỉ số LDL Cholesterol là ${ldl || 'chưa rõ'} mmol/L. ${profileContext('vi', profile)}
Hãy đọc kỹ nhãn dinh dưỡng trong ảnh này và đánh giá xem sản phẩm này có phù hợp với người dùng không, đặc biệt chú ý Chất béo chuyển hóa (Trans fat), Chất béo bão hòa (Saturated fat), Đường bổ sung (Added Sugars), và Chất xơ (Fiber) nếu có trên nhãn. Với mỗi thành phần dinh dưỡng quan trọng, đưa vào mảng "details". Đưa ra khuyến cáo về khẩu phần tối đa hợp lý trong trường "recommendation".
${SCHEMA_NOTE.vi}`,

    'food-manual': ({ food, amount, unit, ldl, profile }) => `Người dùng có chỉ số LDL Cholesterol là ${ldl || 'chưa rõ'} mmol/L và định ăn: "${food}" với khối lượng ${amount} ${unit}. ${profileContext('vi', profile)}
Hãy phân tích xem món ăn này có nhiều chất béo bão hòa, chất béo chuyển hóa, cholesterol hay đường có thể gây hại cho chỉ số LDL của người dùng không. Đưa các yếu tố dinh dưỡng đáng chú ý vào "details". Trong "recommendation", nêu rõ có cần cắt giảm khẩu phần không và tần suất ăn tối đa hợp lý trong tuần.
${SCHEMA_NOTE.vi}`,

    prescription: ({ profile }) => `Đây là ảnh chụp một đơn thuốc. ${profileContext('vi', profile)}
Hãy đọc tên (các) loại thuốc, liều dùng và tần suất sử dụng được ghi trên đơn. Với mỗi loại thuốc, thêm một mục vào "details" gồm: tên thuốc (label), liều dùng + công dụng chính (value), và flag "caution" nếu thuốc này có thể tương tác với bệnh nền/thuốc khác/dị ứng của người dùng đã nêu ở trên, ngược lại dùng "normal". Trong "summary", tóm tắt công dụng chung của đơn thuốc. Trong "recommendation", giải thích cách dùng đúng và các tác dụng phụ thường gặp cần lưu ý. Trường "disclaimer" PHẢI luôn nhắc người dùng xác nhận lại với dược sĩ/bác sĩ trước khi dùng vì chữ viết tay có thể bị đọc sai. Nếu không đọc rõ tên thuốc hoặc liều dùng, hãy ghi rõ điều đó thay vì đoán.
${SCHEMA_NOTE.vi}`,

    'lab-report': ({ profile }) => `Đây là kết quả xét nghiệm y khoa (có thể là ảnh hoặc file PDF). ${profileContext('vi', profile)}
Hãy trích xuất TẤT CẢ các chỉ số xét nghiệm (không chỉ lipid máu — bao gồm cả đường huyết, chức năng gan, thận, công thức máu, v.v. nếu có). Với mỗi chỉ số, thêm vào "details" gồm: tên chỉ số + giá trị + đơn vị (label), khoảng tham chiếu bình thường (value), và flag "danger" nếu vượt xa ngưỡng, "caution" nếu hơi lệch, "normal" nếu trong ngưỡng. Trong "summary", tóm tắt tổng quan tình trạng sức khỏe qua các chỉ số này. Trong "recommendation", đưa ra gợi ý lối sống/dinh dưỡng chung (không kê đơn thuốc). Trường "disclaimer" PHẢI nêu rõ đây không phải chẩn đoán y khoa và người dùng cần trao đổi với bác sĩ.
${SCHEMA_NOTE.vi}`,
  },

  en: {
    'food-scan': ({ ldl, profile }) => `The user's LDL Cholesterol is ${ldl || 'unknown'} mmol/L. ${profileContext('en', profile)}
Carefully read the nutrition label in this image and assess whether the product suits this user, paying special attention to Trans fat, Saturated fat, Added Sugars, and Fiber where present. Add each notable nutrient to the "details" array. Provide a sensible maximum serving suggestion in "recommendation".
${SCHEMA_NOTE.en}`,

    'food-manual': ({ food, amount, unit, ldl, profile }) => `The user's LDL Cholesterol is ${ldl || 'unknown'} mmol/L and they plan to eat: "${food}" in the amount of ${amount} ${unit}. ${profileContext('en', profile)}
Analyze whether this food is high in saturated fat, trans fat, cholesterol, or sugar in a way that could harm this user's LDL level. Put notable nutritional factors into "details". In "recommendation", state whether the portion should be reduced and a reasonable maximum frequency per week.
${SCHEMA_NOTE.en}`,

    prescription: ({ profile }) => `This is a photo of a prescription. ${profileContext('en', profile)}
Read the medication name(s), dosage, and frequency written on it. For each medication, add an entry to "details" with: medication name (label), dosage + primary purpose (value), and flag "caution" if it could interact with the user's stated conditions/other medications/allergies above, otherwise "normal". In "summary", summarize what this prescription is generally for. In "recommendation", explain correct usage and common side effects to watch for. The "disclaimer" field MUST always remind the user to confirm with a pharmacist/doctor before taking anything, since handwriting can be misread. If any medication name or dosage is unclear, say so explicitly rather than guessing.
${SCHEMA_NOTE.en}`,

    'lab-report': ({ profile }) => `This is a medical lab report (image or PDF). ${profileContext('en', profile)}
Extract ALL biomarkers present (not just lipids — include glucose, liver/kidney function, blood count, etc. if shown). For each biomarker, add to "details": name + value + unit (label), the normal reference range (value), and flag "danger" if far out of range, "caution" if mildly out of range, "normal" if within range. In "summary", give an overall picture of health based on these results. In "recommendation", suggest general lifestyle/dietary considerations (do not prescribe medication). The "disclaimer" field MUST state this is not a medical diagnosis and the user should discuss all results with their doctor.
${SCHEMA_NOTE.en}`,
  },
};

export function buildPrompt(mode, params, lang = currentLang) {
  const langPrompts = PROMPTS[lang] || PROMPTS.vi;
  const builder = langPrompts[mode];
  if (!builder) throw new Error(`No prompt builder for mode "${mode}"`);
  return builder(params);
}
