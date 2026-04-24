import { installNetworkHooks } from './interceptor/network';
import { installMapHooks } from './interceptor/maps';
import { installPlayerObserver } from './interceptor/player';
import { installRequestHandlers } from './interceptor/requests';

(function() {
    console.log('IRIS POC: Interceptor initializing (Modular TS)...');
    
    installNetworkHooks();
    installMapHooks();
    installPlayerObserver();
    installRequestHandlers();

    console.log('IRIS POC: Web-Accessible Interceptor Fully Active');
})();
