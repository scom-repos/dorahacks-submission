import { OpenAI } from "openai";
import { config } from "../../config/config";
import { completionServiceConfigs, CompletionService } from "../../config/modelConfig";

// Define a more accurate return type without using the Stream type
type CompletionResult = string | AsyncIterable<any>;

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// Initialize the DeepSeek client
const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: config.DEEPSEEK_API_KEY,
});

export const createCompletion = async (
  messages: any[],
  streaming: boolean = false
): Promise<CompletionResult> => {
  // Explicitly cast config.COMPLETION_SERVICE to the union type CompletionService
  const service = config.COMPLETION_SERVICE as CompletionService;

  // Retrieve the completion service configuration based on the chosen service.
  const completionConfig = completionServiceConfigs[service];

  // Select the appropriate model based on the isRAG flag.
  const model = completionConfig.chatCompletionModel

  // console.log("messages:", messages)

  if (service === "openai") {
    if (streaming) {
      const response = await openai.chat.completions.create({
        model,
        messages: messages as any,
        stream: true
      });
      return response;
    } else {
      const response = await openai.chat.completions.create({
        model,
        messages: messages as any,
      });
      return response.choices[0].message.content ?? "";
    }
  } else if (service === "deepseek") {
    if (streaming) {
      const response = await deepseek.chat.completions.create({
        model,
        messages: messages as any,
        response_format: {
          'type': 'json_object'
        },
        stream: true
      });
      return response;
    } else {
      const response = await deepseek.chat.completions.create({
        model,
        messages: messages as any,
        response_format: {
          'type': 'json_object'
        }
      });
      return response.choices[0].message.content ?? "";
    }
  } else {
    throw new Error("Invalid completion service");
  }
};
