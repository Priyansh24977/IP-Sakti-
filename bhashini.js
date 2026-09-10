import dotenv from "dotenv";

dotenv.config();

// ==================================================
// ENVIRONMENT VARIABLES
// ==================================================

const BHASHINI_USER_ID = process.env.BHASHINI_USER_ID;
const BHASHINI_UDYAT_KEY = process.env.BHASHINI_UDYAT_KEY;
const PIPELINE_ID = process.env.BHASHINI_PIPELINE_ID;

const CONFIG_URL =
  "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";

// ==================================================
// LANGUAGE CODES
// ==================================================

const LANGUAGE_CODES = {
  English: "en",
  Hindi: "hi",
  Tamil: "ta",
  Telugu: "te",
  Bengali: "bn",
  Marathi: "mr",
  Gujarati: "gu",
  Kannada: "kn",
  Malayalam: "ml",
  Punjabi: "pa",
  Odia: "or",
  Assamese: "as",
};

// ==================================================
// VALIDATE CREDENTIALS
// ==================================================

function validateCredentials() {
  if (!BHASHINI_USER_ID) {
    throw new Error("Missing BHASHINI_USER_ID in .env");
  }

  if (!BHASHINI_UDYAT_KEY) {
    throw new Error("Missing BHASHINI_UDYAT_KEY in .env");
  }

  if (!PIPELINE_ID) {
    throw new Error("Missing BHASHINI_PIPELINE_ID in .env");
  }
}

// ==================================================
// GET LANGUAGE CODE
// ==================================================

function getLanguageCode(language) {
  const code = LANGUAGE_CODES[language];

  if (!code) {
    throw new Error(
      `Unsupported Bhashini language: ${language}`
    );
  }

  return code;
}

// ==================================================
// STEP 1
// PIPELINE CONFIG
// ==================================================

async function getPipelineConfig(
  sourceLanguage,
  targetLanguage
) {
  validateCredentials();

  const sourceCode =
    getLanguageCode(sourceLanguage);

  const targetCode =
    getLanguageCode(targetLanguage);

  console.log(
    `🔧 Bhashini config: ${sourceCode} → ${targetCode}`
  );

  const requestBody = {
    pipelineTasks: [
      {
        taskType: "translation",

        config: {
          language: {
            sourceLanguage: sourceCode,
            targetLanguage: targetCode,
          },
        },
      },
    ],

    pipelineRequestConfig: {
      pipelineId: PIPELINE_ID,
    },
  };

  const response = await fetch(CONFIG_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      userID: BHASHINI_USER_ID,

      ulcaApiKey: BHASHINI_UDYAT_KEY,
    },

    body: JSON.stringify(requestBody),
  });

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Bhashini config failed (${response.status}): ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "Bhashini returned invalid JSON."
    );
  }

  return data;
}

// ==================================================
// STEP 2
// FIND TRANSLATION SERVICE
// ==================================================

function findTranslationService(
  configResponse,
  sourceLanguage,
  targetLanguage
) {
  const sourceCode =
    getLanguageCode(sourceLanguage);

  const targetCode =
    getLanguageCode(targetLanguage);

  const translationTask =
    configResponse?.pipelineResponseConfig?.find(
      (task) =>
        task.taskType === "translation"
    );

  if (!translationTask) {
    throw new Error(
      "Bhashini did not return a translation configuration."
    );
  }

  const configs =
    translationTask.config || [];

  const service = configs.find(
    (config) => {
      const source =
        config?.language?.sourceLanguage;

      const target =
        config?.language?.targetLanguage;

      return (
        source === sourceCode &&
        target === targetCode
      );
    }
  );

  if (!service?.serviceId) {
    throw new Error(
      `No translation service found for ${sourceLanguage} → ${targetLanguage}.`
    );
  }

  return service;
}

// ==================================================
// STEP 3
// GET INFERENCE DETAILS
// ==================================================

function getInferenceDetails(
  configResponse
) {
  const endpoint =
    configResponse?.pipelineInferenceAPIEndPoint;

  if (!endpoint) {
    throw new Error(
      "Bhashini did not return pipeline inference details."
    );
  }

  if (!endpoint.callbackUrl) {
    throw new Error(
      "Bhashini did not return an inference callback URL."
    );
  }

  if (!endpoint.inferenceApiKey) {
    throw new Error(
      "Bhashini did not return an inference API key."
    );
  }

  if (
    !endpoint.inferenceApiKey.name ||
    !endpoint.inferenceApiKey.value
  ) {
    throw new Error(
      "Bhashini inference API key is incomplete."
    );
  }

  return {
    callbackUrl:
      endpoint.callbackUrl,

    authName:
      endpoint.inferenceApiKey.name,

    authValue:
      endpoint.inferenceApiKey.value,
  };
}

// ==================================================
// STEP 4
// PIPELINE COMPUTE / INFERENCE
// ==================================================

async function runInference(
  text,
  sourceLanguage,
  targetLanguage,
  translationService,
  inferenceDetails
) {
  const sourceCode =
    getLanguageCode(sourceLanguage);

  const targetCode =
    getLanguageCode(targetLanguage);

  const requestBody = {
    pipelineTasks: [
      {
        taskType: "translation",

        config: {
          language: {
            sourceLanguage: sourceCode,
            targetLanguage: targetCode,
          },

          serviceId:
            translationService.serviceId,
        },
      },
    ],

    inputData: {
      input: [
        {
          source: text,
        },
      ],
    },
  };

  console.log(
    "🚀 Calling Bhashini inference..."
  );

  const response = await fetch(
    inferenceDetails.callbackUrl,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        [inferenceDetails.authName]:
          inferenceDetails.authValue,
      },

      body: JSON.stringify(
        requestBody
      ),
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Bhashini inference failed (${response.status}): ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "Bhashini inference returned invalid JSON."
    );
  }

  return data;
}

// ==================================================
// STEP 5
// EXTRACT TRANSLATED TEXT
// ==================================================

function extractTranslatedText(
  data
) {
  const translationResult =
    data?.pipelineResponse?.find(
      (task) =>
        task.taskType === "translation"
    );

  const translatedText =
    translationResult?.output?.[0]?.target;

  if (!translatedText) {
    console.error(
      "Unexpected Bhashini response:"
    );

    console.error(
      JSON.stringify(
        data,
        null,
        2
      )
    );

    throw new Error(
      "Bhashini returned no translated text."
    );
  }

  return translatedText;
}

// ==================================================
// MAIN TRANSLATION FUNCTION
// ==================================================

export async function translateWithBhashini(
  text,
  sourceLanguage,
  targetLanguage
) {
  if (!text) {
    return text;
  }

  // No translation needed
  if (
    sourceLanguage === targetLanguage
  ) {
    return text;
  }

  console.log(
    `🌐 Bhashini translation: ${sourceLanguage} → ${targetLanguage}`
  );

  // ----------------------------------------------
  // 1. GET PIPELINE CONFIG
  // ----------------------------------------------

  const configResponse =
    await getPipelineConfig(
      sourceLanguage,
      targetLanguage
    );

  // ----------------------------------------------
  // 2. FIND TRANSLATION SERVICE
  // ----------------------------------------------

  const translationService =
    findTranslationService(
      configResponse,
      sourceLanguage,
      targetLanguage
    );

  console.log(
    `🔎 Translation service: ${translationService.serviceId}`
  );

  // ----------------------------------------------
  // 3. GET INFERENCE ENDPOINT
  // ----------------------------------------------

  const inferenceDetails =
    getInferenceDetails(
      configResponse
    );

  // ----------------------------------------------
  // 4. RUN TRANSLATION
  // ----------------------------------------------

  const result =
    await runInference(
      text,
      sourceLanguage,
      targetLanguage,
      translationService,
      inferenceDetails
    );

  // ----------------------------------------------
  // 5. EXTRACT RESULT
  // ----------------------------------------------

  const translatedText =
    extractTranslatedText(result);

  console.log(
    "✅ Bhashini translation successful"
  );

  return translatedText;
}

// ==================================================
// DIRECT TEST
// ==================================================

async function testBhashini() {
  try {
    const result =
      await translateWithBhashini(
        "Can traditional Ayurvedic knowledge be patented in India?",
        "English",
        "Hindi"
      );

    console.log("\n==============================");
    console.log("Bhashini Test Result:");
    console.log("==============================");
    console.log(result);
    console.log("==============================\n");

  } catch (error) {
    console.error("\nBhashini test failed:");
    console.error(error.message);
  }
}

// Run test only when this file
// is executed directly.
const isMain =
  process.argv[1] &&
  process.argv[1].endsWith(
    "bhashini.js"
  );

if (isMain) {
  testBhashini();
}