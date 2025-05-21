/**
 * Polyfills for browser environment to support Node.js modules used by eosjs
 */

// TextEncoder and TextDecoder polyfills
export class TextEncoderPolyfill {
  encode(input: string): Uint8Array {
    const utf8 = unescape(encodeURIComponent(input))
    const result = new Uint8Array(utf8.length)
    for (let i = 0; i < utf8.length; i++) {
      result[i] = utf8.charCodeAt(i)
    }
    return result
  }
}

export class TextDecoderPolyfill {
  decode(input?: Uint8Array): string {
    if (!input) return ''
    const bytes = new Uint8Array(input)
    let result = ''
    let i = 0
    while (i < bytes.length) {
      result += String.fromCharCode(bytes[i++])
    }
    return decodeURIComponent(escape(result))
  }
}

// Export actual TextEncoder/TextDecoder if available, otherwise use polyfills
export function getTextEncoder(): TextEncoder {
  return typeof TextEncoder !== 'undefined' ? new TextEncoder() : new TextEncoderPolyfill()
}

export function getTextDecoder(): TextDecoder {
  return typeof TextDecoder !== 'undefined' ? new TextDecoder() : new TextDecoderPolyfill()
}

// Crypto polyfill (if needed)
export function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto
  }
  throw new Error('Crypto API not available')
}

// Buffer polyfill using Uint8Array
export class BufferPolyfill {
  static from(data: string, encoding?: string): Uint8Array {
    if (encoding === 'hex') {
      return BufferPolyfill.fromHex(data)
    } else if (encoding === 'base64') {
      return BufferPolyfill.fromBase64(data)
    }

    // Default to UTF-8
    return new TextEncoderPolyfill().encode(data)
  }

  static fromHex(hex: string): Uint8Array {
    if (hex.startsWith('0x')) {
      hex = hex.slice(2)
    }
    const len = hex.length
    const result = new Uint8Array(len / 2)
    for (let i = 0; i < len; i += 2) {
      result[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16)
    }
    return result
  }

  static fromBase64(base64: string): Uint8Array {
    try {
      // For browsers
      const binaryString = atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    } catch (e) {
      throw new Error('Base64 decoding failed')
    }
  }
}
