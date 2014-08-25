define([
    "underscore",
    "jquery",
    "eventMgr",
    "settings",
    "utils",
    "text!html/settingsServerEntry.html",
    "text!html/settingsServerAccordion.html"
], function(_, $, eventMgr, settings, utils, settingsServerEntryHTML, settingsServerAccordionHTML) {
    // TODO make sure server.id is unique, as at the moment it may not be unique as it just uses the index in the array.
    var serversMgr = {};

    // This list is used to store new data while editing the server values.
    var serverList = {};

    // When the server settings is opened create the temp server list that will be edited
    eventMgr.addListener("onReady", function() {
        $(".modal-settings").on("show.bs.modal", function() {
            // Clone the current server list, while we make temporary changes
            serverList = buildServerList(settings.servers);
        });
    });

    function buildServerList(servers) {
        var serverList = {};
        _.each(servers, function(serverGroup, key) {
            var newServerGroup = {
                id: key,
                name: serverGroup.name,
                servers: []
            };

            // Copy the server settings
            var maxServerId = 0;
            _.each(serverGroup.servers, function(server, index) {
                var newServer = {
                    id: server.id ? server.id : index,
                    name: server.name,
                    url: server.url
                };
                newServerGroup.servers.push(newServer);

                // Check if the server id is higher than the current max
                if (maxServerId < server.id) {
                    maxServerId = server.id;
                }
            });

            // Set the next server id
            newServerGroup.nextServerId = maxServerId + 1;

            serverList[key] = newServerGroup;
        });

        return serverList;
    }

    function buildServerGroupAccordion(serverGroup) {
        var settingsBlock = _.chain(serverGroup.servers).reduce(function (html, server) {
            return html + buildServerPanel(server, serverGroup.id);
        }, "").value();

        return _.template(settingsServerAccordionHTML, {
            serverGroupId: serverGroup.id,
            serverGroupName: serverGroup.name,
            settingsBlock: settingsBlock,
            isOpen: false
        });
    }

    function buildServerPanel(server, serverGroupId) {
        return _.template(settingsServerEntryHTML, {
            serverGroupId: serverGroupId,
            server: server
        });
    }

    function bindAddButtons() {
        _.each(document.querySelectorAll(".action-servers-add"), function(buttonElt) {
            var $buttonElt = $(buttonElt);
            $buttonElt.click(function(e) {
                e.stopPropagation();
                var $serverGroupElt = $buttonElt.parent();
                var serverGroupId = $serverGroupElt.data("serverGroup");
                var serverGroup = serverList[serverGroupId];

                var newServer = {
                    id: serverGroup.nextServerId++,
                    header: "New Server"
                };

                // Add the server, to the server group
                serverGroup.servers.push(newServer);

                // Add the html for the new server
                var html = buildServerPanel(newServer, serverGroupId);
                var $html = $(html);
                $html.appendTo($serverGroupElt.children().first());

                // Bind the delete button
                bindDeleteButton($html.find(".action-servers-delete"));
            });
        });
    }

    function bindDeleteButton($buttonElt) {
        $buttonElt.click(function(e) {
            e.stopPropagation();
            var $serverElt = $buttonElt.parent().parent();
            var $serverGroupElt = $serverElt.parent().parent();
            var serverGroupId = $serverGroupElt.data("serverGroup");
            var serverId = $serverElt.data("server");
            var serverGroup = serverList[serverGroupId];

            // Find the server and delete it
            serverGroup.servers = _.filter(serverGroup.servers, function(server) {
                return server.id != serverId;
            });

            // Remove the html
            $serverElt.remove();
        });
    }

    function bindDeleteButtons() {
        _.each(document.querySelectorAll(".action-servers-delete"), function(buttonElt) {
            var $buttonElt = $(buttonElt);
            bindDeleteButton($buttonElt);
        });
    }

    function addServerEntries() {
        // Create accordion in settings dialog
        var accordionHtml = _.chain(serverList).sortBy(function(serverGroup, key) {
                return key.toLowerCase();
            }).reduce(function(html, serverGroup) {
                return html + buildServerGroupAccordion(serverGroup);
            }, "").value();
        $('.accordion-servers').html(accordionHtml);

        // Bind the action buttons
        bindAddButtons();
        bindDeleteButtons();
    }

    serversMgr.loadServers = function() {
        // Add the server entries to the page
        addServerEntries();

        // Load the setting values
        _.each(serverList, function(serverGroup) {
            _.each(serverGroup.servers, function(server) {
                utils.setInputValue("#input-settings-server-" + serverGroup.id + "-" + server.id + "-name", server.name);
                utils.setInputValue("#input-settings-server-" + serverGroup.id + "-" + server.id + "-url", server.url);
            });
        });
    };

    serversMgr.saveServers = function(newSettings) {
        newSettings.servers = {};

        // Loop over each server and save the details
        _.each(serverList, function(serverGroup, key) {
            newSettings.servers[key] = {
                name: serverGroup.name,
                servers: []
            };
            _.each(serverGroup.servers, function(server) {
                var newServer = {};
                newServer.id = server.id;
                newServer.name = utils.getInputValue("#input-settings-server-" + serverGroup.id + "-" + server.id + "-name");
                newServer.url = utils.getInputValue("#input-settings-server-" + serverGroup.id + "-" + server.id + "-url");

                // Add the settings if we don't have a name or url
                if (newServer.name || newServer.url) {
                    newSettings.servers[key].servers.push(newServer);
                }
            });
        });
    };

    serversMgr.getServers = function(key) {
        if (_.has(settings.servers, key)) {
            if (settings.servers[key].servers) {
                var serverMap = {};
                _.each(settings.servers[key].servers, function(server, index) {
                    var serverId = server.id ? server.id : index;
                    serverMap[serverId] = server;
                });
                return serverMap;
            } else {
                return {};
            }
        } else {
            return {};
        }
    };

    return serversMgr;
});