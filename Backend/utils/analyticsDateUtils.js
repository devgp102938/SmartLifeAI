const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);



//   This is the single source of truth for valid period identifiers —
//   analyticsService and any controller-level validation should import
//   this rather than hardcoding strings.

const PERIODS = {
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
}

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

//if timezone is missing or invalid
const assertValidTimezone = (tz) => {
    if(!tz){
        throw new Error("Timezone is required");
    }

    if(!isValidTimezone(tz)){
        throw new Error(`Invalid timezone: ${tz}`);
    }
}

//internal helper for rolling n-days range(ex. last 7 days, last 30 days)
const getRollingDaysRange = (now, tz, numberOfDays) => {
    const start = now.subtract(numberOfDays - 1, 'day').toDate();
    return{
        startDate : getStartOfDay(start, tz),
        endDate : getEndOfDay(now.toDate(), tz)
    }
}

//                      ##Public APIS##


//return utc date of start date
const getStartOfDay = (date = new Date(), timezone) => {
    assertValidTimezone(timezone);

    return dayjs(date).tz(timezone).startOf('day').utc().toDate();
}

//return utc end date
const getEndOfDay = (date = new Date(), timezone) => {
    assertValidTimezone(timezone);

    return dayjs(date).tz(timezone).endOf('day').utc().toDate();
}

const validateCustomRange = ({customStart, customEnd, timezone : tz}) =>{
    assertValidTimezone(tz);

    if(!customStart || !customEnd){
        throw new Error('validateCustomRange: customStart and customEnd are both required');
    }

    const start = dayjs(customStart).tz(tz).startOf('day');
    const end = dayjs(customEnd).tz(tz).endOf('day');

    if(!start.isValid() || !end.isValid()){
        throw new Error('validateCustomRange: customStart or customEnd is not a valid date');
    }

    if(start.isAfter(end)){
        throw new Error('validateCustomRange: customStart must be before or equal to customEnd');
    }

    const rangeInDays = end.diff(start, 'day') + 1;
    if(rangeInDays > MAX_CUSTOM_RANGE){
        throw new Error(`validateCustomRange: range exceeds maximum of ${MAX_CUSTOM_RANGE} days`);
    }

    return{
        startDate : getStartOfDay(start.toDate(), tz),
        endDate : getEndOfDay(end.toDate(), tz)
    }
}

const getDateRange = ({period, timezone : tz, referenceDate = new Date(), customStart, customEnd}) => {
    assertValidTimezone(tz);

    if(!Object.values(PERIODS).includes(period)){
        throw new Error(`getDateRange: unsupported period "${period}"`);
    }

    const now = dayjs(referenceDate).tz(tz);

    switch(period){

        case PERIODS.TODAY:
            return{
                startDate : getStartOfDay(referenceDate, tz),
                endDate : getEndOfDay(referenceDate, tz)
            };

        case PERIODS.YESTERDAY:
            const yesterday = now.subtract(1, 'day').toDate();
            return{
                startDate : getStartOfDay(yesterday, tz),
                endDate : getEndOfDay(yesterday, tz)
            };

        //rolling periods : always n days ending
        case PERIODS.LAST_7_DAYS:
            return getRollingDaysRange(now, tz, 7);

        case PERIODS.LAST_30_DAYS:
            return getRollingDaysRange(now, tz, 30);
 
        case PERIODS.LAST_90_DAYS:
            return getRollingDaysRange(now, tz, 90); 
        
        //calender periods fixed boundries
        case PERIODS.THIS_WEEK:
            return{
                startDate : now.startOf('isoWeek').utc().toDate(),
                endDate : getEndOfDay(referenceDate, tz)
            };
        case PERIODS.LAST_WEEK:
            const lastWeek = now.subtract(1, 'week');
            return{
                startDate : lastWeek.startOf('isoWeek').utc().toDate(),
                endDate : lastWeek.endOf('isoWeek').utc().toDate()
            };
        case PERIODS.THIS_MONTH:
            return{
                startDate : now.startOf('month').utc().toDate(),
                endDate : getEndOfDay(referenceDate, tz)
            };
        case PERIODS.LAST_MONTH:
            const lastMonth = now.subtract(1, 'month');
            return{
                startDate : lastMonth.startOf('month').utc().toDate(),
                endDate : lastMonth.endOf('month').utc().toDate()
            };
        case PERIODS.THIS_YEAR:
            return{
                startDate : now.startOf('year').utc().toDate(),
                endDate : getEndOfDay(referenceDate, tz)
            };
        case PERIODS.LIFETIME:
            return{
                startDate : new Date(LIFETIME_START),
                endDate : getEndOfDay(referenceDate, tz)
            }
        case PERIODS.CUSTOM:
            return validateCustomRange({customStart, customEnd, timezone : tz});

        default:
            throw new Error(`getDateRange: unhandled period "${period}"`)
    }
}

const getPreviousPeriod = ({startDate, endDate, timezone : tz}) => {
    assertValidTimezone(tz);

    if (!startDate || !endDate) {
        throw new Error('getPreviousPeriod: startDate and endDate are required');
    }

    const start = dayjs(startDate).utc().tz(tz);
    const end = dayjs(endDate).utc().tz(tz);

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
    getStartOfDay,
    getEndOfDay,
    getDateRange,
    validateCustomRange,
    getPreviousPeriod
}

