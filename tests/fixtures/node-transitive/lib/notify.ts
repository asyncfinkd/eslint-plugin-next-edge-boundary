import { writeLog } from "./write-log";

export function notify(message: string): void {
  writeLog(message);
}
