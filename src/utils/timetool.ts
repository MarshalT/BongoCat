/**
 * 时间工具模块 - 处理项目中所有时间相关操作
 * 
 * 包含功能：
 * - 解析不同格式的时间并处理时区差异
 * - 计算倒计时和时间间隔
 * - 格式化时间显示
 * - 计算时间进度
 */

// 默认使用东八区 (UTC+8)
const DEFAULT_TIMEZONE_OFFSET = 8 * 60 * 60 * 1000;

/**
 * 解析各种格式的时间并应用时区调整
 * 
 * @param time - 时间（可以是ISO字符串、时间戳(秒或毫秒)）
 * @param applyTimezoneOffset - 是否应用时区调整（默认为true）
 * @returns 调整后的时间戳(毫秒)
 */
export function parseTime(time: string | number | Date, applyTimezoneOffset: boolean = true): number {
  try {
    let timestamp: number;
    
    if (time instanceof Date) {
      timestamp = time.getTime();
    }
    else if (typeof time === 'number') {
      // 检查是否为秒级时间戳（小于20亿，假定为秒级时间戳）
      if (time < 2000000000) {
        timestamp = time * 1000; // 转为毫秒
      } else {
        timestamp = time; // 已经是毫秒级时间戳
      }
    } 
    else if (typeof time === 'string') {
      // 解析ISO日期字符串
      const date = new Date(time);
      if (isNaN(date.getTime())) {
        console.error('无效的时间字符串:', time);
        return 0;
      }
      timestamp = date.getTime();
      
      // 对ISO格式时间应用时区调整（如果需要）
      if (applyTimezoneOffset) {
        timestamp += DEFAULT_TIMEZONE_OFFSET;
      }
    } 
    else {
      console.error('不支持的时间格式:', time);
      return 0;
    }
    
    return timestamp;
  } catch (error) {
    console.error('解析时间出错:', error, time);
    return 0;
  }
}

/**
 * 格式化剩余时间为 HH:MM:SS 格式
 * 
 * @param remainingTime - 剩余毫秒数
 * @returns 格式化的时间字符串
 */
export function formatTimeRemaining(remainingTime: number): string {
  if (remainingTime <= 0) {
    return '00 : 00 : 00';
  }
  
  // 转换为小时、分钟、秒
  const hours = Math.floor(remainingTime / (1000 * 60 * 60));
  const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

  // 格式化输出
  return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
}

/**
 * 格式化剩余时间为中文友好格式（x小时x分x秒）
 * 
 * @param remainingTime - 剩余毫秒数
 * @returns 格式化的中文时间字符串
 */
export function formatTimeRemainingChinese(remainingTime: number): string {
  if (remainingTime <= 0) {
    return '可购买';
  }
  
  // 转换为小时、分钟、秒
  const hours = Math.floor(remainingTime / (1000 * 60 * 60));
  const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
  
  let result = '';
  if (hours > 0) result += `${hours}小时`;
  if (minutes > 0 || hours > 0) result += `${String(minutes).padStart(2, '0')}分`;
  result += `${String(seconds).padStart(2, '0')}秒`;
  
  return result;
}

/**
 * 计算时间进度百分比
 * 
 * @param startTime - 开始时间戳(毫秒)
 * @param duration - 总持续时间(毫秒)
 * @returns 进度百分比(字符串，包含%)
 */
export function calculateProgress(startTime: number, duration: number): string {
  const now = Date.now();
  const endTime = startTime + duration;
  
  // 如果当前时间已经过了结束时间，返回100%
  if (now >= endTime) {
    return '100%';
  }
  
  // 计算已过去的时间
  const elapsedTime = now - startTime;
  
  // 计算进度百分比
  const percentage = Math.min(100, Math.max(0, Math.floor((elapsedTime / duration) * 100)));
  
  return `${percentage}%`;
}

/**
 * 计算下一轮次时间
 * 
 * @param lastRoundTime - 上一轮次时间戳(毫秒)
 * @param roundDuration - 轮次持续时间(毫秒)
 * @returns 下一轮次时间戳(毫秒)
 */
export function calculateNextRound(lastRoundTime: number, roundDuration: number): number {
  const now = Date.now();
  let nextRoundTime = lastRoundTime + roundDuration;
  
  // 如果下一轮已经过去，计算再下一轮
  while (nextRoundTime < now) {
    nextRoundTime += roundDuration;
  }
  
  return nextRoundTime;
}

/**
 * 计算倒计时剩余时间
 * 
 * @param targetTime - 目标时间戳(毫秒)
 * @returns 剩余毫秒数
 */
export function calculateCountdown(targetTime: number): number {
  const now = Date.now();
  return Math.max(0, targetTime - now);
}

/**
 * 判断是否已经过了指定的时间间隔
 * 
 * @param lastTime - 上次时间戳(毫秒)
 * @param interval - 间隔时间(毫秒)
 * @returns 是否已经过了间隔
 */
export function isTimePassed(lastTime: number, interval: number): boolean {
  const now = Date.now();
  return (now - lastTime) >= interval;
}

/**
 * 格式化ISO日期字符串为本地友好格式
 * 
 * @param isoDateString - ISO日期字符串
 * @returns 格式化的日期字符串
 */
export function formatISODate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('格式化日期出错:', error, isoDateString);
    return isoDateString;
  }
}
