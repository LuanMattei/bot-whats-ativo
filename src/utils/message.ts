import { proto, WAMessage } from "baileys";
import { logger } from "./logger";

export type FormattedMessage = {
  key: proto.IMessageKey;
  messageTimestamp: number | Long | null | undefined;
  pushName: string | null | undefined;
  content: string | null;
};

export type MessageItem =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "image";
      caption?: string;
      image: string;
    };

/**
 * @param message
 * @returns mensagem formatada do Baileys
 */
export const getMessage = (
  message: WAMessage
): FormattedMessage | undefined => {
  try {
    return {
      key: message.key,
      messageTimestamp: message.messageTimestamp,
      pushName: message.pushName,
      content:
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        null,
    };
  } catch (error) {
    logger.error(error);
  }
};