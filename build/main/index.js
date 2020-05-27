"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const client_1 = __importDefault(require("./client"));
exports.Client = client_1.default;
exports.default = client_1.default;
var mailbox_1 = require("./mailbox");
Object.defineProperty(exports, "SelectedMailbox", { enumerable: true, get: function () { return mailbox_1.SelectedMailbox; } });
var address_1 = require("./address");
Object.defineProperty(exports, "Address", { enumerable: true, get: function () { return address_1.Address; } });
var envelope_1 = require("./envelope");
Object.defineProperty(exports, "Envelope", { enumerable: true, get: function () { return envelope_1.Envelope; } });
var message_1 = require("./message");
Object.defineProperty(exports, "Message", { enumerable: true, get: function () { return message_1.Message; } });
var header_1 = require("./header");
Object.defineProperty(exports, "Header", { enumerable: true, get: function () { return header_1.Header; } });
