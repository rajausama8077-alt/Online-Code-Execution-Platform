const { Queue } = require("bullmq");
const { getBullConnection } = require("../config/redis");

const QUEUE_NAME = "code-run";

const connection = getBullConnection();

const codeRunQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    /** Keep completed jobs ~5 minutes so GET /run/jobs/:id can read returnvalue. */
    removeOnComplete: { age: 300 },
    removeOnFail: false,
  },
});

module.exports = {
  codeRunQueue,
  QUEUE_NAME,
  connection,
};
