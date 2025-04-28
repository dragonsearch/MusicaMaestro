import pino, { transport } from "pino";
// env
// use pino-pretty and save the logs to a file
let ppino = {
  level: "debug",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
        level: "debug",
      },
      {
        target: "pino/file",
        options: {
          destination: "./logs/bot.log",
          mkdir: true,
        },
        level: "debug",
      },
      {
        target: "pino-pretty",
        options: {
          colorize: false,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          destination: "./logs/bot_pretty.log",
          mkdir: true,
        },
        level: "debug",
      },
    ],
  },
};
export let logger = pino(ppino);
