// why is this all commented out? 
// this migration should not be a part of the production application
// it was specific to salt lake only
// leaving in here as a TODO to make a final decision on where this should go


exports.up = function(knex, Promise) {
  return Promise.all([

    // knex.schema.createTable('ctracks', function (table) {
    //   table.increments('id').primary();
    //   table.dateTime('imported');

    //   table.integer('oi_clid');
    //   table.string('os_lname');
    //   table.string('os_fname');
    //   table.string('os_mname');
    //   table.string('os_sfx_name');
    //   table.date('od_dob');
    //   table.integer('oi_ofndr_num');
    //   table.integer('oi_so_num');
    //   table.string('os_prev_supr');
    //   table.integer('oi_prev_agcy_id');
    //   table.integer('oi_slpri_score');
    //   table.string('os_slpri_desc');
    //   table.integer('oi_slpri_fta');
    //   table.integer('oi_slpri_rcd');
    //   table.string('os_degree_list');
    //   table.string('os_ncic_list');
    //   table.string('os_ofnse_typ_list');
    //   table.integer('oi_crnt_agcy_id');
    //   table.date('od_strt_dt');
    //   table.date('od_end_dt');
    //   table.integer('oi_discharge_cd');
    //   table.string('os_discharge_desc');
    //   table.string('os_addr');
    //   table.string('os_city');
    //   table.string('os_st');
    //   table.string('os_zip');
    //   table.string('och_sex');
    //   table.string('os_race');
    //   table.string('os_marital');
    //   table.string('os_age');
    //   table.date('od_crt_dt');
    //   table.string('os_crt_tm');
    //   table.string('os_crt_rm');
    //   table.string('os_crt_loc');
    //   table.string('os_judge');
    // }),


  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([

    // knex.schema.dropTable('ctracks'),

  ]);
};
