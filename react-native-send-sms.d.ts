declare module 'react-native-send-sms' {
  type SendCallback = (message: string) => void;

  const SendSMS: {
    send(phoneNumber: string, body: string, callback: SendCallback): void;
  };

  export default SendSMS;
}
