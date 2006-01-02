dump('entering patron.items.js\n');

if (typeof patron == 'undefined') patron = {};
patron.items = function (params) {

	JSAN.use('util.error'); this.error = new util.error();
	JSAN.use('util.network'); this.network = new util.network();
	this.OpenILS = {}; JSAN.use('OpenILS.data'); this.OpenILS.data = new OpenILS.data(); this.OpenILS.data.init({'via':'stash'});
}

patron.items.prototype = {

	'init' : function( params ) {

		var obj = this;

		obj.session = params['session'];
		obj.patron_id = params['patron_id'];

		JSAN.use('circ.util');
		var columns = circ.util.columns( 
			{ 
				'title' : { 'hidden' : false, 'flex' : '3' },
				'due_date' : { 'hidden' : false },
				'renewal_remaining' : { 'hidden' : false },
			} 
		);

		JSAN.use('util.list'); obj.list = new util.list('items_list');
		obj.list.init(
			{
				'columns' : columns,
				'map_row_to_column' : circ.util.std_map_row_to_column(),
				'retrieve_row' : function(params) {

					var row = params.row;

					var funcs = [
						
						function() {

							row.my.mvr = obj.network.request(
								api.mods_slim_record_retrieve_via_copy.app,
								api.mods_slim_record_retrieve_via_copy.method,
								[ row.my.circ.target_copy() ]
							);

						},
						
						function() {


							row.my.acp = obj.network.request(
								api.fm_acp_retrieve.app,
								api.fm_acp_retrieve.method,
								[ row.my.circ.target_copy() ]
							);

						},

						function() {

							if (typeof params.on_retrieve == 'function') {
								params.on_retrieve(row);
							}

						},
					];

					JSAN.use('util.exec'); var exec = new util.exec();
					exec.on_error = function(E) {
						//var err = 'items chain: ' + js2JSON(E);
						//obj.error.sdump('D_ERROR',err);
						return true; /* keep going */
					}
					exec.chain( funcs );

					return row;
				},
				'on_select' : function(ev) {
					JSAN.use('util.functional');
					var sel = obj.list.retrieve_selection();
					var list = util.functional.map_list(
						sel,
						function(o) { return o.getAttribute('retrieve_id'); }
					);
					if (typeof obj.on_select == 'function') {
						obj.on_select(list);
					}
					if (typeof window.xulG == 'object' && typeof window.xulG.on_select == 'function') {
						obj.error.sdump('D_PATRON','patron.items: Calling external .on_select()\n');
						window.xulG.on_select(list);
					} else {
						obj.error.sdump('D_PATRON','patron.items: No external .on_select()\n');
					}
				},
			}
		);
		
		JSAN.use('util.controller'); obj.controller = new util.controller();
		obj.controller.init(
			{
				'control_map' : {
					'cmd_broken' : [
						['command'],
						function() { alert('Not Yet Implemented'); }
					],
					'cmd_item_print' : [
						['command'],
						function() {
						}
					],
					'cmd_item_claimed_returned' : [
						['command'],
						function() {
						}
					],
					'cmd_item_renew' : [
						['command'],
						function() {
						}
					],
					'cmd_item_checkin' : [
						['command'],
						function() {
						}
					],
					'cmd_show_catalog' : [
						['command'],
						function() {
						}
					],
				}
			}
		);

		obj.retrieve();

	},

	'retrieve' : function() {
		var obj = this;
		if (window.xulG && window.xulG.checkouts) {
			obj.checkouts = window.xulG.checkouts;
		} else {
			obj.checkouts = obj.network.request(
				api.fm_circ_retrieve_via_user.app,
				api.fm_circ_retrieve_via_user.method,
				[ obj.session, obj.patron_id ]
			);
				
		}

		function gen_list_append(checkout) {
			return function() {
				obj.list.append(
					{
						'retrieve_id' : checkout.id(),
						'row' : {
							'my' : {
								'circ' : checkout,
							}
						},
					}
				);
			};
		}

		JSAN.use('util.exec'); var exec = new util.exec();
		var rows = [];
		for (var i in obj.checkouts) {
			rows.push( gen_list_append(obj.checkouts[i]) );
		}
		exec.chain( rows );
	},

	'on_select' : function() {
		obj.controller.view.cmd_patron_retrieve.setAttribute('disabled','false');
		obj.controller.view.cmd_search_form.setAttribute('disabled','false');
		obj.retrieve_ids = list;
	}
}

dump('exiting patron.items.js\n');
