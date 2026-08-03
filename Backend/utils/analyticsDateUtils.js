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
    LAST_7_DAYS : 'last_7_days',
    LAST_WEEK : 'last_week',
    LAST_30_DAYS : 'last_30_days',
    THIS_MONTH : 'this_month',
    LAST_MONTH : 'last_month',
    LAST_90_DAYS : 'last_90_days',
    THIS_YEAR : 'this_year',
    CUSTOM : 'custom',
    LIFETIME : 'lifetime'
}

//A sentinel start date for "lifetime" queries — far enough back to be safe.
const LIFETIME_START = '1970-01-01T00:00:00.000Z';

//return utc date of start date
function getStartDate(date = new Date(), timezone){
    if(!timezone){
        throw new Error("Timezone is required");
    }

    return dayjs(date).tz(timezone).startOf('day').utc().toDate();
}

//return utc end date
function getEndDate(date = new Date(), timezone){
    if(!timezone){
        throw new Error("Timezone is required");
    }

    return dayjs(date).tz(timezone).endOf('day').utc().toDate();
}