var lbsappstore = {
    init: function () {
        $.getJSON('/api/apps/', function (data) {
            var vm = new viewModel();
            vm.populateFromRawData(data)
            vm.setActiveApp();
            vm.setInitalFilter();
            console.log(ko.toJS(vm));
            ko.applyBindings(vm);
            $('pre code').each(function (i, e) { hljs.highlightBlock(e) });
        });
    }
};

/**
ViewModel for whole application
*/
var viewModel = function () {
    var self = this;

    self.apps = ko.observableArray();
    self.expandedApp = ko.observable();
    self.activeFilter = ko.observable();
    self.searchvalue = ko.observable();

    // self.hitcounter = ko.observable();


    // utility for converting to grid
    self.listToMatrix = function (list, elementsPerSubArray) {
        var matrix = [], i, k;
        for (i = 0, k = -1; i < list.length; i++) {
            if (i % elementsPerSubArray === 0) {
                k++;
                matrix[k] = [];
            }
            matrix[k].push(list[i]);
        }
        return matrix;
    }

    // populate VM from JSON data
    self.populateFromRawData = function (rawData) {
        $(rawData.apps).each(function (index, app) {
            if (app.name) {
                self.apps.push(new appFactory(app))
            }
        });
    }

    // post processing
    self.postProcessingLogic = function (elements) {
        $(elements).find("#expanded-" + self.expandedApp()).modal('show');
    };

    // computed grid view with filters
    self.appsGrid = ko.computed(function () {
        //filter apps in the correct status
        var apps = ko.utils.arrayFilter(this.apps(), function (item) {
            if (self.searchvalue()) {

                if ((item.appName().toLowerCase().indexOf(self.searchvalue().toLowerCase()) >= 0)) {
                    if (self.activeFilter().text === 'All') {
                        return item.info.status() === 'Release' || item.info.status() === 'Beta'
                    }
                    else if (self.activeFilter().text === 'New') {
                        if (Object.prototype.toString.call(item.info.versions()[0]) !== '[object Undefined]') {
                            return moment(item.info.versions()[0].date()).format('YYYY-MM-DD') > moment().subtract(90, 'days').format('YYYY-MM-DD');
                        }
                    }
                    else {
                        return item.info.status() == (self.activeFilter() ? self.activeFilter().text : '');
                    }
                }
            }
            else {
                if (self.activeFilter()) {
                    if (self.activeFilter().text === 'All') {
                        return item.info.status() === 'Release' || item.info.status() === 'Beta'
                    }
                    else if (self.activeFilter().text === 'New') {
                        if (Object.prototype.toString.call(item.info.versions()[0]) !== '[object Undefined]') {
                            return moment(item.info.versions()[0].date()).format('YYYY-MM-DD') > moment().subtract(90, 'days').format('YYYY-MM-DD') && (item.info.status() === 'Release' || item.info.status() === 'Beta');
                        }
                    }
                    else {
                        return item.info.status() == (self.activeFilter() ? self.activeFilter().text : '');
                    }
                }
            }
        });

        // sort
        apps.sort(function (l, r) { return l.name() > r.name() ? 1 : -1 });

        if (self.searchvalue()) {

        }

        // transform into grid
        return self.listToMatrix(apps, 3);
    }, this);

    // set active app
    self.setActiveApp = function () {
        // App show be shown from start

        var activeApp = ko.utils.arrayFirst(self.apps(), function (item) {
            return "#" + item.name() == location.hash;
        });

        if (activeApp) {
            activeApp.expandedApp(true);
            self.expandedApp(activeApp.name())
        }
    }

    // set initial filter
    self.setInitalFilter = function () {
        var filter = ko.utils.arrayFirst(self.avaliableStatuses(), function (item) {
            return item.text == 'All';
        });
        self.selectStatusFilter(filter);
    }

    // computed view of avaliable statuses
    self.avaliableStatuses = ko.computed(function () {
        // get the statuses
        var values = ko.utils.arrayMap(self.apps(), function (item) {
            return item.info.status();
        });
        values.push('All');
        values.push('New');
        // make them unique
        values = ko.utils.arrayGetDistinctValues(values).sort();
        // assign new meta data
        values = ko.utils.arrayMap(values, function (item) {
            var text = item;
            var style;
            var selected = false;
            switch (item) {
                case 'Release':
                    style = "btn-success"
                    break;
                case 'Beta':
                    style = "btn-warning"
                    break;
                case 'Development':
                    style = "btn-danger"
                    break;
                    // case 'All':
                    // 	style = "btn-default"
                    // 	break;
                    // case 'New':
                    // 	style = "btn-default"
                    // 	break;
            }

            // return an object with properties
            return {
                text: text,
                style: style,
                default_style: 'btn-default',
                selected: ko.observable(selected)
            }
        });

        return values;
    });


    // assign a status filter
    self.selectStatusFilter = function (item) {
        // disable old filter
        if (self.activeFilter()) {
            self.activeFilter().selected(false);
            $('.nav-appstore').find('a').removeClass('active-appstore');
            $('#' + item.text).addClass('active-appstore');
        }
        // set new filter
        self.activeFilter(item);

        // enable filter
        self.activeFilter().selected(true);
    }

    // assign a status filter
    self.showStartFilter = function (item) {
        self.activeFilter(item);
        self.activeFilter().selected(true);
    }
}


/**
ViewModel for an app
*/
var appFactory = function (app) {
    var self = this;
    /**
	Sets default picture if app images is missing.
	*/
    if (app.images == "") {
        self.images = ["img/_default.png"];
    }
    else {
        self.images = app.images;
    }
    self.name = ko.observable(app.name)
    self.readme = marked(app.readme);
    self.expandedApp = ko.observable(false);
    self.info = ko.mapping.fromJS(app.info);
    self.license = ko.observable(app.info.license);
    self.statusColor = ko.computed(function () {
        if (self.info.status) {
            switch (app.info.status) {
                case 'Release':
                    return "label-success"
                case 'Beta':
                    return "label-warning"
                case 'Development':
                    return "label-danger"
                case 'N/A':
                    return "label-danger"
            }
        }
    });

    // 	$(app.info).each(function(index, item){
    // 		console.log(item.name);
    // 	self.searchString = self.searchString + item;
    // 	});

    // console.log(self.searchString);

    self.expandApp = function (app) {
        app.expandedApp(true);
        location.hash = app.name()
        $("#expanded-" + app.name()).modal('show');
    };

    self.closeApp = function (app) {
        app.expandedApp(false);
        location.hash = '';
        $("#expanded-" + app.name()).modal('hide');
    };

    self.download = function () {
        if (!self.license()) {
            location.href = '/api/apps/' + self.name() + '/download/'
        }
    };

    self.appName = ko.computed(function () {
        if (self.info) {
            return self.info.name();
        } else {
            return self.name();
        }
    });

    self.githubAddress = function () {
        location.href = 'https://github.com/Lundalogik/LimeBootstrapAppStore/tree/master/' + self.name()
    };
}


/**
Lets get this party on the road
*/
$(function () {
    $(document).ready(function () {
        lbsappstore.init();
        if ($(location.hash).length > 0) {
            $("#expanded-checklist").modal('show');
        }
    });
});


ko.bindingHandlers.icon = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // var content = lbs.common.iconTemplate.format(ko.unwrap(valueAccessor()));
        var content = "<i class='glyphicon " + ko.unwrap(valueAccessor()) + "'></i>"
        if (
            $(element).text() !== '' && $(element).text().substring(0, content.length) != content) {
            $(element).prepend(content);
            element = $(element).get(0);
        }
    }
};


