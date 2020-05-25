import Envelope from './envelope';

export interface Message {
  uid?: string;
  envelope?: Envelope;
}

export default Message;
