import { installNetworkHooks } from './interceptor/network';
import { installMapHooks } from './interceptor/maps';
import { installPlayerObserver } from './interceptor/player';
import { installRequestHandlers } from './interceptor/requests';

(function() {
    console.log('Mini IRIS: Interceptor initializing (Modular TS)...');
    
    installNetworkHooks();
    installMapHooks();
    installPlayerObserver();
    installRequestHandlers();

    console.log('Mini IRIS: Web-Accessible Interceptor Fully Active');
})();
