import crypto from 'crypto';

export const encode = async (value: string, key: Buffer) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encryptedData = cipher.update(value, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  return { iv: iv.toString('hex'), encryptedData };
};

export const decode = async (encodedData: { iv: string, encryptedData: string }, key: Buffer) => {
  const iv = Buffer.from(encodedData.iv, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decryptedData = decipher.update(encodedData.encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');

  return decryptedData;
};

export const generateKey = async () => {
  return crypto.randomBytes(32);
};

export const encryptionKey = async (encryptionKeyHex: string) => {
  return Buffer.from(encryptionKeyHex, 'hex');
};



//  HOTP / TOTP Functions

// // converting interger to byte array (for HOTP counter)
// function intToBytes(num: number) : number [] {
//   const bytes = Array(8);

//   for(let i = 7; i >= 0; --i ) {
//     bytes[i] = num & 255;
//     num = num >> 8;
//   }

//   return bytes;
// } 

// // HMSC base OTP 

// export function generateHOTP(secret: string, counter: number): string {
//   const buffer = Buffer.alloc(8);
//   for (let i = 7; i >= 0; i--) {
//     buffer[i] = counter & 0xff;
//     counter >>= 8;
//   }

//   const secretBuffer = base32Decode(secret);
//   const hmac = crypto.createHmac('sha1', secretBuffer);
//   const digest = hmac.update(buffer).digest();

//   const offset = digest[digest.length - 1] & 0xf;
//   const binary = 
//     ((digest[offset] & 0x7f) << 24) |
//     ((digest[offset + 1] & 0xff) << 16) |
//     ((digest[offset + 2] & 0xff) << 8) |
//     (digest[offset + 3] & 0xff);

//   return (binary % 1000000).toString().padStart(6, '0');
// }

// export function verifyHOTP(token: string, secret: string, counter: number, window = 5): boolean {
//   for (let i = counter - window; i <= counter + window; i++) {
//     if (generateHOTP(secret, i) === token) {
//       return true;
//     }
//   }
//   return false;
// }

// export function generateTOTP(secret: string, timeStep = 30): string {
//   const counter = Math.floor(Date.now() / 1000 / timeStep);
//   return generateHOTP(secret, counter);
// }

// export function verifyTOTP(
//   token: string, 
//   secret: string, 
//   timeStep = 30, 
//   window = 1
// ): boolean {
//   const counter = Math.floor(Date.now() / 1000 / timeStep);
  
//   for (let i = counter - window; i <= counter + window; i++) {
//     if (generateHOTP(secret, i) === token) {
//       return true;
//     }
//   }
  
//   return false;
// }

// export function generateTOTPSecret(): string {
//   const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
//   const secretLength = 32;
//   let secret = '';
  
//   const randomBytes = crypto.randomBytes(secretLength);
  
//   for (let i = 0; i < secretLength; i++) {
//     secret += base32Chars[randomBytes[i] % 32];
//   }
//   console.log(secret); 
//   console.log(/^[A-Z2-7]{32}$/.test(secret)); 
  
//   return secret;
// }

// function base32Decode(encoded: string): Buffer {
//   const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
//   let buffer = 0;
//   let bits = 0;
//   let count = 0;
//   const result = [];
  
//   encoded = encoded.replace(/=+$/, '').toUpperCase();
  
//   for (let i = 0; i < encoded.length; i++) {
//     const char = encoded[i];
//     const index = alphabet.indexOf(char);
    
//     if (index === -1) continue;
    
//     buffer = (buffer << 5) | index;
//     bits += 5;
    
//     if (bits >= 8) {
//       result[count++] = (buffer >>> (bits - 8)) & 255;
//       bits -= 8;
//     }
//   }
  
//   return Buffer.from(result);
// }

// // generate totp with uri for QR codes

// export function generateTOTPURI(secret: string, email: string, issuer: string = 'WorkPlay'): string {
 
//   const cleanSecret = secret
//     .toUpperCase()
//     .replace(/[^A-Z2-7]/g, '');
    
//   if (cleanSecret.length < 16 || cleanSecret.length > 32) {
//     throw new Error(`Invalid TOTP secret length: ${cleanSecret.length}`);
//   }

//   const encodedIssuer = encodeURIComponent(issuer);
//   const encodedEmail = encodeURIComponent(email);

//   return `otpauth://totp/${encodedIssuer}:${encodedEmail}?` +
//          `secret=${cleanSecret}&` +
//          `issuer=${encodedIssuer}&` +
//          `algorithm=SHA1&` +
//          `digits=6&` +
//          `period=30`;
// }

// export function testTOTPImplementation(): boolean {
//   const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
//   const testValues = [
//     { time: 59, code: '287082' },
//     { time: 1111111109, code: '081804' },
//     { time: 1111111111, code: '050471' }
//   ];

//   let allPassed = true;
  
//   testValues.forEach(({ time, code }) => {
//     const counter = Math.floor(time / 30);
//     const generated = generateHOTP(secret, counter);
//     const passed = generated === code;
//     console.log(`Time: ${time}, Expected: ${code}, Got: ${generated}`, 
//                 passed ? '✓' : '✗');
//     allPassed &&= passed;
//   });

//   if (allPassed) {
//     console.log('✅ All TOTP tests passed');
//   } else {
//     console.error('❌ Some TOTP tests failed');
//   }

//   return allPassed;
// }