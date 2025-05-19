declare module 'eosjs-ecc' {
  export function randomKey(): Promise<string>;
  export function privateToPublic(privateKey: string): string;
  export function sign(data: string, privateKey: string): string;
  export function verify(signature: string, data: string, publicKey: string): boolean;
  export function recover(signature: string, data: string): string;
  export function isValidPrivate(privateKey: string): boolean;
  export function isValidPublic(publicKey: string): boolean;
} 