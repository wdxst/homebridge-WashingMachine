const miio = require("miio");

module.exports = (api) => {
    api.registerAccessory("WashingMachine", WashingMachine);
}

class WashingMachine {
    constructor(log, config, api) {
        this.Characteristic = api.hap.Characteristic;
        this.Service = api.hap.Service;
        this.log = log;
        this.name = config["name"];
        this.address = config["address"];
        this.token = config["token"];

        this.informationService = new this.Service.AccessoryInformation()
            .setCharacteristic(this.Characteristic.Manufacturer, "clo-studio")
            .setCharacteristic(this.Characteristic.SerialNumber, "1116")
            .setCharacteristic(this.Characteristic.Model, "WashingMachine(Valve)")
            .setCharacteristic(this.Characteristic.FirmwareRevision, "2.0");

        this.valveService = new this.Service.Valve(this.name);
        this.valveService.getCharacteristic(this.Characteristic.ValveType)
            .onGet(this.getValveType.bind(this));
        this.valveService.getCharacteristic(this.Characteristic.Active)
            .onSet(this.setActive.bind(this));

        setInterval(this.updateState.bind(this), 5000);
    }

    getServices() {
        return [this.informationService, this.valveService];
    }

    async getValveType() {
        return 1;
    }

    async setActive(active) {
        try {
            if(active) {
                await this.device.call("set_properties", [{siid:2, piid:1, value:true}]);
                await this.device.call("set_properties", [{siid:2, piid:3, value:24}]);
                await this.device.call("action", {siid:2, aiid:2, did: "call-2-2", in: [] }, { retries: 1 });
            } else {
                await this.device.call("action", {siid:2, aiid:1, did: "call-2-1", in: [] }, { retries: 1 });
                await this.device.call("set_properties", [{siid:2, piid:1, value:false}]);
            } 
        } catch(error) {
            this.log.error(this.name, "setduration:", error);
        }
    }

    async updateState() {
        try {
            const result = await this.device.call("get_properties", [{siid:2, piid:1}, {siid:2, piid:2}, {siid:2, piid:3}, {siid:2, piid:10}]);
            this.log(result);
            if(result[1].value == 3) {
                this.valveService.getCharacteristic(this.Characteristic.Active).updateValue(1);
                this.valveService.getCharacteristic(this.Characteristic.InUse).updateValue(1);
            } else {
                this.valveService.getCharacteristic(this.Characteristic.Active).updateValue(0);
                this.valveService.getCharacteristic(this.Characteristic.InUse).updateValue(0);  
            }
            this.valveService.getCharacteristic(this.Characteristic.RemainingDuration).updateValue(result[3].value*60);
        } catch(error) {
            miio.device({
                address: this.address,
                token: this.token
            }).then(device => this.device = device)
            .catch(error => this.log.error(this.name, error));
        }
    }
}
