import pg from 'pg';

pg.types.setTypeParser(1082, (value) => value);
