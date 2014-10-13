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

    var appRouter = require('app/appRouter');
    var utils = require('app/utils');
    var ItemPageView = require('app/components/itemPageView');
    var collectionTemplate = require('text!app/templates/itemCollectionTemplate.html');
    var effects = require('app/effects');

    var CollectionView = Backbone.View.extend({
        manage: true,
        
        tagName: 'div',
        className: 'anyconf-collection-container',
        template: _.template(collectionTemplate),
        
        pages: [],
        pagesByItemId: {},
        
        pageHeight: null,
        prevPage: null,
        currentPage: null,
        nextPage: null,

        pageOverlay: null,
        
        pointerStarted: false,
        animating: false,
        swipeChecked: false,
        
        routeId: null,
        inView: false,
        
        events: {
            'pointerdown': 'pointerDown',
            'pointermove': 'pointerMove',
            'pointerup': 'pointerUp',
            'pointercancel': 'pointerUp',
            'pointerleave': 'pointerUp'
        },
        
        initialize: function() {
            var _this = this;

            if( this.options.id ) {
                this.id = this.options.id;
            }
            
            if( this.options.routeInHandler ) {
                this.handleRouteIn = this.options.routeInHandler;
            }

            var documentPointerUp = function(jqEvt) {
                if( _this.el.parentNode ) {
                    _this.pointerUp.call(_this, jqEvt);
                }
            };
            $(document).on({
                pointerleave: documentPointerUp,
                pointerup: documentPointerUp
            });
            
            this.pageHeight = window.innerHeight;
            this.pageOverlay = document.createElement('div');
            this.pageOverlay.className = 'js-page-overlay';
            
            appRouter.on('route:' + this.routeId, function() {
                _this.handleRouteIn.apply(_this, arguments);
            });
        },

        handleRouteIn: function(instanceId, itemId) {
            if( this.id == instanceId ) {
                appRouter.setCurrentView(this);
                this.render();
            }
        },
        
        leave: function() {
            // this.el.style.display = 'none';
            this.transitionOut();
        },
        
        transitionFromClass: function(className) {
            var classList = this.el.classList;
            if( classList.contains(className) ) {
                console.error('unexpected classlist re-add');
                this.animating = false;
            } else {
                this.animating = true;
                console.log('Start animating...');
                classList.add(className);
            }
        },
        
        setCurrentPage: function(itemPage) {
            this.currentPage = itemPage;
            this.nextPage = null;
            this.prevPage = null;
            for( var i = 0; i < this.pages.length; i++ ) {
                var page = this.pages[i];
                // page.el.setAttribute('data-i', i);
                if( page === itemPage ) {
                    if( i > 0 ) {
                        this.prevPage = this.pages[i-1];
                    }
                    if( i < this.pages.length-1 ) {
                        this.nextPage = this.pages[i+1];
                        this.nextPage.render();
                    }
                    page.render();
                } else {
                    page.hide();
                }
            }
            if( this.prevPage ) {
                this.prevPage.renderAsPrevious();
            }
            if( this.nextPage ) {
                this.nextPage.render();
            }
        },
        
        positionOverlay: function() {
            this.pageOverlay.classList.remove('js-page-overlay-removed');
            this.listEl.insertBefore(this.pageOverlay, this.currentPage.el);
        },
        
        updateOverlay: function() {
            var _this = this;
            _this.animating = true;
            
            var onTransitionEnd = function(evt) {
                _this.animating = false;
                console.log('overlay transition end');
                evt.target.removeEventListener('webkitTransitionEnd', onTransitionEnd);
                _this.positionOverlay();
            };

            this.pageOverlay.classList.add('js-page-overlay-removed');
            this.pageOverlay.addEventListener('webkitTransitionEnd', onTransitionEnd);
        },
        
        addToNewPage: function() {
            this.currentPage = new ItemPageView({
                pageHeight: this.pageHeight,
                parentView: this
            });
            this.pages.push(this.currentPage);
            this.listEl.insertBefore( this.currentPage.el, this.listEl.firstChild );
        },

        addElToPage: function(itemView) {
            this.currentPage.el.appendChild( itemView.el );
            this.pagesByItemId[ itemView.model.id ] = this.currentPage;
        },
        
        addItem: function(model) {
            if( !this.currentPage ) {
                this.addToNewPage();
            }
            var itemView = new this.ItemView({
                model: model,
                parentView: this
            }).render();
            
            // See if it fits on the page
            this.addElToPage( itemView );
            var viewBottom = itemView.el.offsetTop + itemView.el.offsetHeight;
            var pageBottom = this.currentPage.el.offsetTop + this.currentPage.el.offsetHeight;

            if( viewBottom > pageBottom ) {
                this.addToNewPage();
                this.addElToPage( itemView );
            }
            // Fix the page's height
            var pageHeight = this.currentPage.el.offsetHeight;
            this.currentPage.el.style.height = pageHeight + 'px';
            this.listEl.style.height = pageHeight + 'px';
        },
        
        transitionToNext: function() {
            var _this = this;

            // animate current page up
            this.currentPage.transitionOut(function() {
                _this.setCurrentPage(_this.nextPage);
                _this.updateOverlay();
                _this.pageOverlay.style.opacity = null;
            });
        },
        
        transitionToPrevious: function() {
            var _this = this;
            if( !this.prevPage ) {
                return;
            }
            // pull previous from top
            this.prevPage.transitionIn(function() {
                _this.setCurrentPage(_this.prevPage);
                _this.positionOverlay();
            });
        },
        
        transitionPreviousAway: function() {
            var _this = this;
            this.prevPage.transitionOut(function() {
                _this.setCurrentPage(_this.currentPage);
                _this.positionOverlay();
            });
        },
        
        transitionCurrentBack: function() {
            var _this = this;
            this.pageOverlay.style.opacity = 1;

            this.currentPage.transitionIn(function() {
                _this.setCurrentPage(_this.currentPage);
                _this.positionOverlay();
                _this.pageOverlay.style.opacity = null;
            });
        },
        
        pointerDown: function(jqEvt) {
            var evt = jqEvt.originalEvent;
            var _this = this;
            console.log('pointerdown');
            if( this.animating || !this.currentPage ) {
                evt.preventDefault();
                return;
            }
            
            // evt.preventDefault();
            // evt.stopPropagation();
            this.startPoint = {
                x: evt.clientX,
                y: evt.clientY
            };
            this.lastPoint = {
                x: this.startPoint.x,
                y: this.startPoint.y
            };
            this.lastDiff = {
                x: 0,
                y: 0
            };
            this.targetEl = this.currentPage.el;
            this.pageOffsetY = 0;
            this.overlayOpacity = 0;

            this.pointerStarted = true;
            this.rAFIndex = requestAnimationFrame(function() {
                _this.draw();
            });
            this.currentPage.el.classList.remove('js-page-transition-in');
            this.currentPage.el.classList.remove('js-page-transition-out');
        },
        
        pointerMove: function(jqEvt) {
            var evt = jqEvt.originalEvent;
            if( !this.pointerStarted ) {
                this.animating = false;
                return;
            }
            console.log('pointermove');
            evt.preventDefault();
            
            var targetEl = this.currentPage.el;
            var prevEl;
            if( this.prevPage ) {
                prevEl = this.prevPage.el;
            }
            var currentPoint = {
                x: evt.clientX,
                y: evt.clientY
            };
            this.lastDiff = {
                x: currentPoint.x - this.lastPoint.x,
                y: currentPoint.y - this.lastPoint.y
            };
            this.lastPoint = currentPoint;
            
            if( !this.swipeChecked ) {
                // determine if scrolling or page swiping
                var absX = Math.abs( this.lastDiff.x );
                var absY = Math.abs( this.lastDiff.y );
                
                // More horizontal than vertical = swiping
                this.swiping = (absX > absY);

                this.swipeChecked = true;

                if( this.swiping ) {
                    console.log('LIST: SWIPING (no scroll)');
                    // No more interaction here
                    this.swipeChecked = false;
                    this.swiping = false;
                    this.pointerStarted = false;
                    return;
                }
                console.log('LIST: NOT SWIPING (allow scroll)');
            }
            
            var offsetY = currentPoint.y - this.startPoint.y;
            if( offsetY < 0 ) {
                // drag current page up
                this.targetEl = targetEl;
                this.pageOffsetY = offsetY;

                // utils.setTransform(targetEl, 'translateY(' + offsetY + 'px) translateZ(0)');
                var amount = -(offsetY / this.pageHeight);
                this.overlayOpacity = (1 - amount).toFixed(2);

                // this.pageOverlay.style.opacity = (1 - amount).toFixed(2);
                
                this.pendingPage = this.nextPage;
            } else if( prevEl ) {
                // drag previous page down
                offsetY = Math.min( -this.pageHeight + offsetY * 1.5, 0 );
                this.pageOffsetY = offsetY;
                this.targetEl = prevEl;

                // utils.setTransform(prevEl, 'translateY(' + offsetY + 'px) translateZ(0)');
                this.pendingPage = this.prevPage;
            }
        },
        
        handleEmptyPointerUp: function(jqEvt) {
            jqEvt.preventDefault();
            if( jqEvt.target.tagName === 'A' ) {
                var href = jqEvt.target.getAttribute('href');
                console.log('appRouter goto: ' + href);
                appRouter.goTo(this, href, 'none');
            }
        },
        
        pointerUp: function(jqEvt) {
            console.log('pointerup');
            var evt = jqEvt.originalEvent;
            cancelAnimationFrame(this.rAFIndex);
            
            if( !this.currentPage ) {
                this.handleEmptyPointerUp(jqEvt);
                return false;
            }
            
            var targetEl = this.currentPage.el;
            
            if( !this.pointerStarted ) {
                return;
            }
            
            if( this.swiping ) {
                this.swiping = false;
            }
            this.swipeChecked = false;
            if( this.startPoint.y == this.lastPoint.y ) {
                this.pointerStarted = false;
                return;
            }
            evt.preventDefault(); // this prevents click event
            evt.stopPropagation();
            
            if( this.lastDiff.y > 0 ) {
                if( !this.prevPage && this.pendingPage ) {
                    this.transitionCurrentBack();
                } else if( this.pendingPage === this.prevPage ) {
                    this.transitionToPrevious();
                } else {
                    this.transitionCurrentBack();
                }
            } else if( this.lastDiff.y <= 0 ) {
                if( !this.nextPage ) {
                    this.transitionCurrentBack();
                } else if( this.pendingPage === this.nextPage ) {
                    this.transitionToNext();
                } else if(this.prevPage) {
                    this.transitionPreviousAway();
                }
            }
            this.pointerStarted = false;
        },

        draw: function() {
            
            var _this = this;
            if( this.pointerStarted ) {
                this.rAFIndex = requestAnimationFrame(function() {
                    _this.draw();
                });
            }

            console.log('DRAW', this.pageOffsetY);
            utils.setTransform(this.targetEl, 'translateY(' + this.pageOffsetY + 'px) translateZ(0)');	
            this.pageOverlay.style.opacity = this.overlayOpacity;
        },

        beforeRender: function() {
            this.prevPage = null;
            this.currentPage = null;
            this.nextPage = null;
            this.pages = [];
            this.pagesByItemId = {};
        },
        
        afterRender: function() {
            this.inView = true;
            this.el.style.display = 'block';
            this.listEl = this.$el.find('.js-item-view-container')[0];
            // var viewType = this.options.type;
            
            if( this.options.filter ) {
                var filteredModels = this.collection.filter(this.options.filter);
                this.subCollection = new Backbone.Collection(filteredModels);
            } else {
                this.subCollection = this.collection;
            }
            
            this.subCollection.each(function(itemModel) {
                this.addItem(itemModel);
            }, this);
            
            if( this.subCollection.length === 0 ) {
                this.showEmptyPage();
                this.transitionIn();
                return;
            }
            
            var itemId = appRouter.getSubRoute();
            var page = this.pagesByItemId[ itemId ] || this.pages[0];

            // appView.setCurrentView(this);
            this.setCurrentPage( page );
            
            this.positionOverlay();
            
            this.transitionIn();
            if( this.checkTime ) {
                this.checkTime.call(this);
            }
        },
        
        destroy: function() {
            this.$el.remove();
            this.inView = false;
        }, 
       
        
        transitionIn: function() {
            var _this = this;
            var transitionId = appRouter.transitionId || 'none';
            var el = this.el;
            
            var onTransitionEnd = function(evt) {
                _this.animating = false;
                el.style.overflow = null;
                el.style.display = 'block';
                console.log('transitionInEnd', _this.cid);
            };
            
            effects.startTransition({
                id: transitionId,
                type: 'in',
                el: el,
                onEnd: onTransitionEnd
            });

            // Hide to allow other view to be visible on sides
            el.style.overflow = 'hidden'; // disable this?
        },

        transitionOut: function(transitionId) {
            var _this = this;
            var el = this.el;
            
            var onTransitionEnd = function(evt) {
                _this.animating = false;
                el.style.overflow = null;
                el.style.display = 'none';
                utils.setTransform(el, 'none');
                console.log('transitionInEnd', _this.cid);
            };
            
            effects.startTransition({
                id: transitionId,
                type: 'out',
                el: el,
                onEnd: onTransitionEnd
            });

            // Hide to allow other view to be visible on sides
            el.style.overflow = 'hidden'; // disable this?
        },
        
        serialize: function() {
        },
        
        hide: function() {
            // this.el.removeEventListener('pointerdown', this.pointerDown);
            this.pointerStarted = false;
            this.el.style.display = 'none';
        }
    });

    return CollectionView;
});
