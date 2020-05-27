"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.Header = exports.Envelope = exports.Mailbox = void 0;
const client_1 = __importDefault(require("./client"));
const mailbox_1 = require("./mailbox");
Object.defineProperty(exports, "Mailbox", { enumerable: true, get: function () { return mailbox_1.SelectedMailbox; } });
const envelope_1 = __importDefault(require("./envelope"));
exports.Envelope = envelope_1.default;
const message_1 = __importDefault(require("./message"));
exports.Message = message_1.default;
const header_1 = __importDefault(require("./header"));
exports.Header = header_1.default;
exports.default = client_1.default;
