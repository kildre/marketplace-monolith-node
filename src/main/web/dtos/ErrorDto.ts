
/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorDto:
 *       type: object
 *       properties:
 *         errMsg:
 *           type: string
 *           example: "An unexpected error occurred."
 *       required:
 *         - errMsg
 */
export default class ErrorDto {
  errMsg: string;

  constructor(errMsg: string) {
    this.errMsg = errMsg;
  }
}
