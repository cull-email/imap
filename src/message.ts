import Envelope from './envelope';

export interface Message {
  id: string;
  envelope?: Envelope;
}

export default Message;
