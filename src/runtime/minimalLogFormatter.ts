import { LogFormatter, LogItem } from '@aws-lambda-powertools/logger'
import type { LogAttributes, UnformattedAttributes } from '@aws-lambda-powertools/logger/types'

/**
 * appLog 専用フォーマッター。
 * PowerTools の固定フィールド（cold_start, function_arn 等）を除外し、
 * アプリケーションログのフィールドのみを出力する。
 */
export class MinimalLogFormatter extends LogFormatter {
  formatAttributes(attributes: UnformattedAttributes, additionalLogAttributes: LogAttributes): LogItem {
    return new LogItem({
      attributes: {
        level: attributes.logLevel,
        message: attributes.message,
        timestamp: this.formatTimestamp(attributes.timestamp),
        ...additionalLogAttributes,
      },
    })
  }
}
