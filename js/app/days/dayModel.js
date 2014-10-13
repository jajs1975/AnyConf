/*
Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
define(function(require, exports, module) {

    var SpeakerCollection = require('app/speakers/speakerCollection');
    //var speakerCollection = new SpeakerCollection();

    var DayModel = Backbone.Model.extend({

        selected: false,
        isToday: false,

        initialize: function() {
            var dateStr = this.get('date');
            this.id = dateStr;
            this.setDayOfWeek(dateStr);
        },
        
        setDayOfWeek: function(dayStr) {
            var dayOfWeek;
            var day = moment(dayStr);
            var curDate = moment().format("YYYY-MM-DD");
            var dayDate = day.format("YYYY-MM-DD");
            if( dayDate == curDate ) {
                this.isToday = true;
                dayOfWeek = 'TODAY';
            } else {
                dayOfWeek = day.format('dddd').toUpperCase();
            }
            this.set('dayOfWeek', dayOfWeek);
        }
    });

    return DayModel;
});
