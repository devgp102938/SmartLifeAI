const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

// Custom validation AnalyticsValidationError for analytics-related input validation.
// This allows AnalyticsValidationError middleware to distinguish validation AnalyticsValidationErrors from database AnalyticsValidationErrors and unexpected AnalyticsValidationErrors.

class AnalyticsValidationError extends Error{
    constructor(message){
        super(message);
        this.name = 'AnalyticsValidationError';

        if(AnalyticsValidationError.captureStackTrace){
            Error.captureStackTrace(this, AnalyticsValidationError);
        }
    }
}


//   This is the single source of truth for valid period identifiers —
//   analyticsService and any controller-level validation should import
//   this rather than hardcoding strings.

const PERIODS = Object.freeze({
    TODAY : 'today',
    YESTERDAY : 'yesterday',
    LAST_7_DAYS : 'last7days',
    THIS_WEEK : 'thisWeek',
    LAST_WEEK : 'lastWeek',
    LAST_30_DAYS : 'last30days',
    THIS_MONTH : 'thisMonth',
    LAST_MONTH : 'lastMonth',
    LAST_90_DAYS : 'last90days',
    THIS_YEAR : 'thisYear',
    CUSTOM : 'custom',
    LIFETIME : 'lifetime'
});

//Set used for efficient period validation.
const VALID_PERIODS = new Set(Object.values(PERIODS));

//A sentinel start date for "lifetime" queries — far enough back to be safe.
const LIFETIME_START = '1970-01-01T00:00:00.000Z';

const MAX_CUSTOM_RANGE = 366; //ONE FULL YEAR

//internal guard for validating invalid string and validate string for real IANA timezones
const isValidTimezone = (tz) => {
    if(!tz || typeof tz !== 'string'){
        return false;
    }

    try{
        const testDate = dayjs().tz(tz);
        return testDate.isValid();
    }
    catch(err){
        return false;
    }
}

/** * Throws AnalyticsValidationError when timezone is missing or invalid. 
 * @param {string} tz 
 * @throws {AnalyticsValidationError} 
 */

//if timezone is missing or invalid
const assertValidTimezone = (tz) => {
    if(!tz){
        throw new AnalyticsValidationError("Timezone is required");
    }

    if(!isValidTimezone(tz)){
        throw new AnalyticsValidationError(`Invalid timezone: ${tz}`);
    }
}

/** * Internal helper for rolling N-day analytics ranges. 
* Examples: * - Last 7 days * - Last 30 days * - Last 90 days *
* @param {dayjs.Dayjs} now 
  @param {string} tz 
  @param {number} numberOfDays 
  @returns {{ * startDate: Date, * endDate: Date * }}
**/

const getRollingDaysRange = (now, tz, numberOfDays) => {
    const start = now.subtract(numberOfDays - 1, 'day').toDate();
    return{
        startDate : getStartOfDay(start, tz),
        endDate : getEndOfDay(now.toDate(), tz)
    }
}

//                      ##Public APIS##


/** * Returns the UTC start-of-day boundary for a date * in the supplied timezone. 
 * @param {Date|string|number} [date=new Date()] * @param {string} timezone 
 * @returns {Date} * * @example * getStartOfDay(new Date(), 'Asia/Kolkata'); 
 */

const getStartOfDay = (date = new Date(), timezone) => {
    assertValidTimezone(timezone);

    return dayjs(date).tz(timezone).startOf('day').utc().toDate();
}

/** * Returns the UTC end-of-day boundary for a date * in the supplied timezone. 
 * @param {Date|string|number} [date=new Date()] * @param {string} timezone 
 * @returns {Date} 
 * @example 
 * getEndOfDay(new Date(), 'Asia/Kolkata');
 *  */

const getEndOfDay = (date = new Date(), timezone) => {
    assertValidTimezone(timezone);

    return dayjs(date).tz(timezone).endOf('day').utc().toDate();
}


/** * Validates and converts a custom analytics date range * into UTC boundaries. 
 * Important: * dayjs.tz(value, timezone) is used so the input is parsed 
 * directly inside the requested timezone. 
 *  @param {Object} options 
 *  @param {string|Date} options.customStart 
 *  @param {string|Date} options.customEnd 
 *  @param {string} options.timezone 
 *  @returns {{ * startDate: Date, * endDate: Date * }} 
 *  @throws {AnalyticsValidationError} */


const validateCustomRange = ({customStart, customEnd, timezone : tz}) =>{
    assertValidTimezone(tz);

    if(!customStart || !customEnd){
        throw new AnalyticsValidationError('validateCustomRange: customStart and customEnd are both required');
    }

    const start = dayjs.tz(customStart, tz).startOf('day');
    const end = dayjs.tz(customEnd, tz).endOf('day');

    if(!start.isValid() || !end.isValid()){
        throw new AnalyticsValidationError('validateCustomRange: customStart or customEnd is not a valid date');
    }

    if(start.isAfter(end)){
        throw new AnalyticsValidationError('validateCustomRange: customStart must be before or equal to customEnd');
    }

    const rangeInDays = end.diff(start, 'day') + 1;
    if(rangeInDays > MAX_CUSTOM_RANGE){
        throw new AnalyticsValidationError(`validateCustomRange: range exceeds maximum of ${MAX_CUSTOM_RANGE} days`);
    }

    return{
        startDate : getStartOfDay(start.toDate(), tz),
        endDate : getEndOfDay(end.toDate(), tz)
    }
}

/** * Returns UTC boundaries for the requested analytics period. 
 * @param {Object} options 
 * @param {string} options.period 
 * @param {string} options.timezone 
 * @param {Date} [options.referenceDate]
 * @param {string|Date} [options.customStart] 
 * @param {string|Date} [options.customEnd] 
 * @returns {{ * period: string, * timezone: string, * startDate: Date, * endDate: Date * }} 
 * @throws {AnalyticsValidationError} 
 * @example  getDateRange({ * period: PERIODS.LAST_30_DAYS, * timezone: 'Asia/Kolkata' * }); */

const getDateRange = ({period, timezone : tz, referenceDate = new Date(), customStart, customEnd}) => {
    assertValidTimezone(tz);

    if(!VALID_PERIODS.has(period)){
        throw new AnalyticsValidationError(`getDateRange: unsupported period "${period}"`);
    }

    const now = dayjs(referenceDate).tz(tz);

    const metadata = {
        period,
        timezone : tz
    }

    switch(period){

        case PERIODS.TODAY:{
            return{
                ...metadata,

                startDate : getStartOfDay(referenceDate, tz),
                endDate : getEndOfDay(referenceDate, tz)
            };
        }

        case PERIODS.YESTERDAY:{
            const yesterday = now.subtract(1, 'day').toDate();
            return{
                ...metadata,

                startDate : getStartOfDay(yesterday, tz),
                endDate : getEndOfDay(yesterday, tz)
            };
        }

        //rolling periods : always n days ending  //last 7 days including today
        case PERIODS.LAST_7_DAYS: {
            return {
                ...metadata,

                ...getRollingDaysRange(now, tz, 7)
            }
        }
        //last 30 days including today
        case PERIODS.LAST_30_DAYS: { 
            return {
                ...metadata,

                ...getRollingDaysRange(now, tz, 30)
            }
        }
        //last 90 days including today
        case PERIODS.LAST_90_DAYS: {
            return {
                ...metadata,

                ...getRollingDaysRange(now, tz, 90) 
            }
        }
        
        //calender periods fixed boundries
        case PERIODS.THIS_WEEK: {
            return{
                ...metadata,

                startDate : now.startOf('isoWeek').utc().toDate(),
                endDate : getEndOfDay(referenceDate, tz)
            };
        }

        case PERIODS.LAST_WEEK: {
            const lastWeek = now.subtract(1, 'week');
            return{
                ...metadata,

                startDate : lastWeek.startOf('isoWeek').utc().toDate(),
                endDate : lastWeek.endOf('isoWeek').utc().toDate()
            };
        }

        case PERIODS.THIS_MONTH: {
            return{
                ...metadata,

                startDate : now.startOf('month').utc().toDate(),
                endDate : getEndOfDay(referenceDate, tz)
            };
        }

        case PERIODS.LAST_MONTH: {
            const lastMonth = now.subtract(1, 'month');
            return{
                ...metadata,

                startDate : lastMonth.startOf('month').utc().toDate(),
                endDate : lastMonth.endOf('month').utc().toDate()
            };
        }

        case PERIODS.THIS_YEAR: {
            return{
                ...metadata,

                startDate : now.startOf('year').utc().toDate(),
                endDate : getEndOfDay(referenceDate, tz)
            };
        }

        case PERIODS.LIFETIME: {
            return{
                ...metadata,

                startDate : new Date(LIFETIME_START),
                endDate : getEndOfDay(referenceDate, tz)
            }
        }

        case PERIODS.CUSTOM: {
            const range = validateCustomRange({
                customStart, customEnd, timezone : tz
            });

            return {
                ...metadata,
                ...range
            }
        }

        default: {
            throw new AnalyticsValidationError(`getDateRange: unhandled period "${period}"`)
        }
            
    }
}


/** * Returns the previous equivalent date range. This does NOT mean the previous calendar period. 
 * Example: Current:  August 1 - August 4 
 * Previous equivalent:  July 28 - July 31 
 * This is useful for dashboard comparisons where 
 * the previous range should have the same number of days. 
 * @param {Object} options 
 * @param {Date|string} options.startDate 
 * @param {Date|string} options.endDate 
 * @param {string} options.timezone
 * @returns {{ * startDate: Date, * endDate: Date * }} 
 * @throws {AnalyticsValidationError}
 *  */


const getPreviousEquivalentRange = ({startDate, endDate, timezone : tz}) => {
    assertValidTimezone(tz);

    if (!startDate || !endDate) {
        throw new AnalyticsValidationError('getPreviousEquivalentRange: startDate and endDate are required');
    }

    const start = dayjs(startDate).utc().tz(tz);
    const end = dayjs(endDate).utc().tz(tz);

    if(!start.isValid() || !end.isValid()){
        throw new AnalyticsValidationError('getPreviousEquivalentRange: startDate or endDate is not a valid date');
    }

    if(start.isAfter(end)){
        throw new AnalyticsValidationError('getPreviousEquivalentRange: startDate must be before or equal to endDate');
    }

    const durationInDays = end.diff(start, 'day') + 1;

    const previousEnd = start.subtract(1, 'day');
    const previousStart = previousEnd.subtract(durationInDays - 1, 'day');

    return{
        startDate : getStartOfDay(previousStart.toDate(), tz),
        endDate : getEndOfDay(previousEnd.toDate(), tz)
    }
}

module.exports = {
    PERIODS,
    VALID_PERIODS,
    MAX_CUSTOM_RANGE,
    AnalyticsValidationError,

    getStartOfDay,
    getEndOfDay,
    getDateRange,
    validateCustomRange,
    getPreviousEquivalentRange
}

