import { writeLog } from "./write-log";

export function notify(message: string): string {
  writeLog(message);
  return message;
}
