define(function(require, exports, module) {
    var config = require('app/config');
    var SessionModel = require('app/sessions/sessionModel');

    var SessionCollection = Backbone.Collection.extend({
        url: config.url + 'sessions.json',
        model: SessionModel,
        
        initialize: function() {
            _.bindAll(this, 'selectionChangeHandler');
            this.on('change:selected', this.selectionChangeHandler);
            this.on('sync', this.setSpeakerData, this);
        },
        
        setSpeakerData: function() {
            this.each(function(model) {
                var sessionSpeakers = [];
                var allSpeakers = this.speakerCollection;
                
                var speaker_ids = model.get('speaker_ids');
                _.forEach(speaker_ids, function( speakerId ) {
                    sessionSpeakers.push( allSpeakers.get( speakerId ) );
                });
                model.set('sessionSpeakers', sessionSpeakers);
            }, this);
        },
        
        setSpeakers: function(speakers) {
            this.speakerCollection = speakers;
        },
        
        selectionChangeHandler: function(model) {
            if (this.selected) {
               this.selected.set({
                   'selected': false
               });
            }
            this.selected = model;
        },

		makeDate: function(day, time) {
			var dateString = day + ' ' + time;
			var date = moment(dateString);
			if( !date.isValid() ) {
				throw Error('Invalid time: ' + dateString);
			}
			return date;
		},
		
        parse: function(sessionDataArr) {
			var sessionArr = [];
			for( var i = 0; i < sessionDataArr.length; i++ ) { 
				var sessionData = sessionDataArr[i];
				var firstInstance = sessionData.instances[0];
				
				sessionData.startTime = this.makeDate(firstInstance.date, firstInstance.time);
				sessionData.endTime = sessionData.startTime.clone().add('m', firstInstance.duration);
				sessionData.title = sessionData.name;
				sessionData.details = sessionData.description;
				sessionData.room = firstInstance.room_id;
				sessionData.dayId = firstInstance.date;
				
				sessionArr.push( sessionData );
			}
            
            return sessionArr;
        }
    });

    return SessionCollection;
});
