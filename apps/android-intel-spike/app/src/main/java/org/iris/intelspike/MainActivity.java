package org.iris.intelspike;

import android.annotation.SuppressLint;
import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.PopupMenu;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public final class MainActivity extends Activity {
    private static final String INTEL_URL = "https://intel.ingress.com/";
    private static final String IRIS_MODE = "iris-mode";
    private static final int LOCATION_PERMISSION_REQUEST = 1;
    private static final String LOCATION_DECIDED = "location-permission-decided";
    private static final String LOCATION_REQUEST_COUNT = "location-permission-request-count";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private LocationPermissionFlow locationPermissions;
    private TextView status;
    private ProgressBar progress;
    private String loadStatus;
    private String sessionStatus;
    private String irisStatus;
    private String lastExternalHost = "none";
    private String probeKey;
    private int pageGeneration;
    private boolean pageFailed;
    private boolean irisProbe;
    private volatile boolean irisMode;
    private volatile boolean stockDashboardBlocked;
    private boolean resumed;
    private boolean pageFinished;
    private boolean autoStarted;
    private int pollEpoch;
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();
    private Future<?> updateTask;
    private AlertDialog updateDialog;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        irisMode = getPreferences(MODE_PRIVATE).getBoolean(IRIS_MODE, true);
        loadStatus = getString(R.string.loading, NavigationPolicy.host(INTEL_URL));
        sessionStatus = getString(R.string.not_checked);
        irisStatus = getString(R.string.iris_not_loaded);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(getColor(R.color.app_background));
        // Target 36 draws edge-to-edge. Keep controls and web content outside system bars/keyboard.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                applyLegacyInsets(view, insets);
            }
            return insets;
        });
        LinearLayout header = new LinearLayout(this);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        header.setPadding(dp(8), 0, dp(8), 0);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.ic_launcher);
        logo.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        header.addView(logo, new LinearLayout.LayoutParams(dp(28), dp(28)));
        TextView title = new TextView(this);
        title.setText(R.string.app_title);
        title.setTextSize(18);
        title.setPadding(dp(8), 0, 0, 0);
        header.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        title.setGravity(android.view.Gravity.CENTER_VERTICAL);
        Button menuButton = button(R.string.app_menu, () -> {});
        menuButton.setOnClickListener(view -> showAppMenu(menuButton));
        header.addView(menuButton);
        root.addView(header);
        status = new TextView(this);
        status.setPadding(dp(12), 0, dp(12), dp(8));
        showStatus(loadStatus);
        status.setAccessibilityLiveRegion(TextView.ACCESSIBILITY_LIVE_REGION_POLITE);
        root.addView(status);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        webView = new WebView(this);
        locationPermissions = new LocationPermissionFlow(new LocationPermissionFlow.Host() {
            @Override public boolean isIntelPage() { return NavigationPolicy.isIntel(webView.getUrl()); }
            @Override public boolean hasLocationPermission() {
                return hasLocationAccess();
            }
            @Override public boolean canRequestLocationPermissions() {
                return !getPreferences(MODE_PRIVATE).getBoolean(LOCATION_DECIDED, false)
                        || shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_COARSE_LOCATION)
                        || shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION);
            }
            @Override public void requestLocationPermissions() {
                getPreferences(MODE_PRIVATE).edit().putInt(LOCATION_REQUEST_COUNT,
                        getPreferences(MODE_PRIVATE).getInt(LOCATION_REQUEST_COUNT, 0) + 1).apply();
                requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,
                        Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
            }
        });
        configureWebView();
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
        if (state == null || webView.restoreState(state) == null) webView.loadUrl(INTEL_URL);
        else webView.reload(); // History restores independently of DOM/JS; rebuild the current document in its saved mode.
    }

    @SuppressWarnings("deprecation")
    private void applyLegacyInsets(android.view.View view, WindowInsets insets) {
        view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private Button button(int label, Runnable action) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setOnClickListener(view -> action.run());
        return button;
    }

    private void showStatus(String message) {
        status.setText(message);
        status.setVisibility(android.view.View.VISIBLE);
    }

    private void showAppMenu(android.view.View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add(R.string.about).setOnMenuItemClickListener(item -> { showAbout(); return true; });
        menu.getMenu().add(R.string.check_updates).setOnMenuItemClickListener(item -> { checkUpdates(); return true; });
        menu.getMenu().add(R.string.releases).setOnMenuItemClickListener(item -> { openBrowser(ReleaseUpdate.RELEASES_URL); return true; });
        menu.getMenu().add(R.string.reload).setOnMenuItemClickListener(item -> { webView.reload(); return true; });
        android.view.SubMenu recovery = menu.getMenu().addSubMenu(R.string.recovery);
        recovery.add(R.string.load_iris).setOnMenuItemClickListener(item -> { openMode(true); return true; });
        recovery.add(R.string.open_intel).setOnMenuItemClickListener(item -> { openMode(false); return true; });
        menu.getMenu().add(R.string.diagnostics).setOnMenuItemClickListener(item -> { showDiagnostics(); return true; });
        menu.show();
    }

    private void showAbout() {
        new AlertDialog.Builder(this).setTitle(R.string.about)
                .setMessage(getString(R.string.about_text, getString(R.string.spike_version)))
                .setPositiveButton(android.R.string.ok, null)
                .setNeutralButton(R.string.feedback, (dialog, which) -> openBrowser("https://github.com/amsdams/iris-intel/issues/new"))
                .setNegativeButton(R.string.privacy, (dialog, which) -> showPrivacy()).show();
    }

    private void showPrivacy() {
        new AlertDialog.Builder(this).setTitle(R.string.privacy).setMessage(R.string.privacy_text)
                .setPositiveButton(android.R.string.ok, null).show();
    }

    @SuppressWarnings("deprecation") // versionCode is needed on API 26–27.
    private long installedVersionCode() throws PackageManager.NameNotFoundException {
        PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    private void checkUpdates() {
        if (updateDialog != null) return;
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle(R.string.check_updates)
                .setMessage(R.string.updates_checking)
                .setPositiveButton(android.R.string.ok, null)
                .setNeutralButton(R.string.releases, (ignored, which) -> openBrowser(ReleaseUpdate.RELEASES_URL))
                .create();
        updateDialog = dialog;
        dialog.setOnDismissListener(ignored -> {
            updateDialog = null;
            if (updateTask != null) updateTask.cancel(true);
            updateTask = null;
        });
        dialog.show();
        updateTask = updateExecutor.submit(() -> {
            String message;
            try {
                ReleaseUpdate update = ReleaseUpdate.fetch();
                message = getString(update.isNewerThan(installedVersionCode())
                        ? R.string.updates_available : R.string.updates_current,
                        getString(R.string.spike_version), update.versionName);
            } catch (IOException | PackageManager.NameNotFoundException error) {
                message = getString(R.string.updates_failed);
            }
            final String result = message;
            runOnUiThread(() -> {
                if (!isFinishing() && !isDestroyed() && updateDialog == dialog && dialog.isShowing()) {
                    dialog.setMessage(result);
                }
            });
        });
    }

    private void openMode(boolean useIris) {
        webView.stopLoading();
        invalidateProbe();
        irisMode = useIris;
        getPreferences(MODE_PRIVATE).edit().putBoolean(IRIS_MODE, useIris).apply();
        webView.loadUrl(INTEL_URL);
    }

    @SuppressLint("SetJavaScriptEnabled") // Intel requires JavaScript; no privileged native JS interface is exposed.
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setUserAgentString(LoginUserAgent.forWebView(settings.getUserAgentString()));
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags
                & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                locationPermissions.request(origin, callback::invoke);
            }

            @Override public void onGeolocationPermissionsHidePrompt() {
                locationPermissions.cancel();
            }

            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value == 100 ? android.view.View.GONE : android.view.View.VISIBLE);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!request.isForMainFrame() && "GET".equals(request.getMethod()) && StockIntelPolicy.blocks(url, irisMode)) {
                    stockDashboardBlocked = true;
                    return new WebResourceResponse("text/javascript", "UTF-8", 200, "OK",
                            Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(new byte[0]));
                }
                if (!BundledAssets.handles(url)) return null;
                if (!"GET".equals(request.getMethod())) return assetError(405, "Method Not Allowed");
                String path = BundledAssets.path(url);
                if (path == null) return assetError(404, "Not Found");
                try {
                    return new WebResourceResponse(BundledAssets.mimeType(path),
                            path.endsWith(".png") ? null : "UTF-8", 200, "OK",
                            Collections.singletonMap("Cache-Control", "no-store"), getAssets().open(path));
                } catch (IOException error) { return assetError(404, "Not Found"); }
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (NavigationPolicy.isEmbedded(url)) return false;
                if (request.isForMainFrame()) openBrowser(url);
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                locationPermissions.onPageStarted();
                clearIntelLocationDenial();
                invalidateProbe();
                pageFinished = false;
                autoStarted = false;
                stockDashboardBlocked = false;
                if (!NavigationPolicy.isEmbedded(url)) {
                    view.stopLoading();
                    pageFailed = true;
                    openBrowser(url);
                    return;
                }
                pageFailed = false;
                sessionStatus = getString(R.string.not_checked);
                irisStatus = getString(R.string.iris_not_loaded);
                loadStatus = getString(R.string.loading, NavigationPolicy.host(url));
                showStatus(loadStatus);
            }

            @Override public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                if (!pageFailed) {
                    pageFinished = true;
                    loadStatus = getString(R.string.loaded, NavigationPolicy.host(url));
                    status.setVisibility(android.view.View.GONE);
                    maybeLoadIris(0);
                }
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) failPage(getString(R.string.load_failed, error.getErrorCode()));
            }

            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) failPage(getString(R.string.http_failed, response.getStatusCode()));
            }
        });
    }

    private void maybeLoadIris(int attempt) {
        if (!resumed || !irisMode || !pageFinished || pageFailed || autoStarted || probeKey != null
                || !NavigationPolicy.isIntel(webView.getUrl())) return;
        final int generation = pageGeneration;
        final int epoch = pollEpoch;
        webView.evaluateJavascript("Boolean(document.readyState === 'complete' && document.body && window.PLAYER"
                + " && typeof window.PLAYER.nickname === 'string' && window.PLAYER.nickname)", result -> {
            if (generation != pageGeneration || epoch != pollEpoch || !resumed || !irisMode
                    || autoStarted || probeKey != null || !NavigationPolicy.isIntel(webView.getUrl())) return;
            if ("true".equals(result)) {
                autoStarted = true;
                startProbe("load-iris.js", true);
            } else if (attempt < 10) {
                handler.postDelayed(() -> maybeLoadIris(attempt + 1), 500);
            }
        });
    }

    private WebResourceResponse assetError(int code, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", code, reason,
                Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(new byte[0]));
    }

    private void failPage(String message) {
        pageFailed = true;
        invalidateProbe();
        loadStatus = message;
        showStatus(message);
        progress.setVisibility(android.view.View.GONE);
    }

    private void openBrowser(String url) {
        lastExternalHost = NavigationPolicy.host(url);
        if (NavigationPolicy.host(url).isEmpty()) {
            showStatus(getString(R.string.blocked_navigation));
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));
            loadStatus = getString(R.string.browser_opened);
        } catch (ActivityNotFoundException error) {
            loadStatus = getString(R.string.browser_unavailable);
        }
        showStatus(loadStatus);
    }

    private void checkSession() {
        if (probeKey != null) return;
        startProbe("session-check.js", false);
    }

    private void startProbe(String asset, boolean loadIris) {
        if (!NavigationPolicy.isIntel(webView.getUrl()) || !pageFinished || pageFailed) {
            showStatus(getString(R.string.intel_required));
            return;
        }
        invalidateProbe();
        irisProbe = loadIris;
        final int generation = pageGeneration;
        final String key = "__irisSessionProbe_" + UUID.randomUUID().toString().replace("-", "");
        probeKey = key;
        String checking = getString(loadIris ? R.string.iris_loading : R.string.checking);
        if (loadIris) irisStatus = checking;
        else sessionStatus = checking;
        showStatus(checking);
        try (InputStream stream = getAssets().open(asset)) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int length;
            while ((length = stream.read(buffer)) != -1) bytes.write(buffer, 0, length);
            String script = bytes.toString(StandardCharsets.UTF_8.name())
                    .replace("__IRIS_PROBE_KEY__", JSONObject.quote(key));
            webView.evaluateJavascript(script, ignored -> pollProbe(key, generation, 0));
        } catch (IOException error) {
            finishProbe(getString(R.string.probe_failed));
        }
    }

    private void pollProbe(String key, int generation, int attempt) {
        if (!resumed || generation != pageGeneration || !key.equals(probeKey) || !NavigationPolicy.isIntel(webView.getUrl())) return;
        final int epoch = pollEpoch;
        if (attempt >= (irisProbe ? 160 : 60)) {
            finishProbe(getString(irisProbe ? R.string.iris_timeout : R.string.check_timeout));
            return;
        }
        webView.evaluateJavascript("window[" + JSONObject.quote(key) + "] || null", result -> {
            if (!resumed || epoch != pollEpoch || generation != pageGeneration || !key.equals(probeKey)) return;
            String message = null;
            try {
                Object value = new JSONTokener(result).nextValue();
                if (value instanceof String) message = (String) value;
            } catch (JSONException ignored) { /* A navigation can discard the JS result. */ }
            if (message != null && !message.equals(getString(irisProbe ? R.string.iris_loading : R.string.checking))) {
                webView.evaluateJavascript("delete window[" + JSONObject.quote(key) + "]", null);
                finishProbe(message);
            } else {
                handler.postDelayed(() -> pollProbe(key, generation, attempt + 1), 250);
            }
        });
    }

    private void finishProbe(String message) {
        if (irisProbe) irisStatus = message;
        else sessionStatus = message;
        showStatus(message);
        probeKey = null;
        if (message.startsWith("PASS")) status.setVisibility(android.view.View.GONE);
        if (!irisProbe) maybeLoadIris(0);
    }

    private void invalidateProbe() {
        pageGeneration++;
        pollEpoch++;
        handler.removeCallbacksAndMessages(null);
        probeKey = null;
    }

    private void showDiagnostics() {
        PackageInfo provider = WebView.getCurrentWebViewPackage();
        String text = getString(R.string.diagnostic_text, getString(R.string.spike_version), Build.VERSION.RELEASE,
                provider == null ? "unknown" : provider.versionName, NavigationPolicy.host(webView.getUrl()),
                loadStatus, sessionStatus, lastExternalHost, irisStatus,
                irisMode ? "IRIS" : "Stock Intel", stockDashboardBlocked ? "blocked" : "not observed",
                hasLocationAccess() ? "allowed" : "denied",
                getPreferences(MODE_PRIVATE).getInt(LOCATION_REQUEST_COUNT, 0));
        new AlertDialog.Builder(this).setTitle(R.string.diagnostics).setMessage(text)
                .setPositiveButton(android.R.string.ok, null)
                .setNegativeButton(R.string.check_session, (dialog, which) -> checkSession())
                .setNeutralButton(R.string.copy, (dialog, which) -> {
                    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.diagnostics), text));
                    Toast.makeText(this, R.string.copied, Toast.LENGTH_SHORT).show();
                }).show();
    }

    private void goBack() {
        if (!NavigationPolicy.isIntel(webView.getUrl()) || !pageFinished) {
            goBackInHistory();
            return;
        }
        final int generation = pageGeneration;
        webView.evaluateJavascript("(() => { if (location.origin !== 'https://intel.ingress.com') return 'history';"
                + " if (document.getElementById('iitc-iris-root')) {"
                + " const event = new Event('IITC_IRIS_HOST_BACK', {cancelable:true});"
                + " window.dispatchEvent(event); return event.defaultPrevented ? 'handled' : 'root'; }"
                + " return window.PLAYER && window.PLAYER.nickname ? 'root' : 'history'; })()", result -> {
            if (!resumed || generation != pageGeneration) return;
            if ("\"handled\"".equals(result)) return;
            if ("\"root\"".equals(result)) moveTaskToBack(true);
            else goBackInHistory();
        });
    }

    private void goBackInHistory() {
        if (webView.canGoBack()) webView.goBack();
        else finish();
    }

    // API 33+ uses the native OnBackInvokedDispatcher registered above. This is only the API 26–32 fallback.
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { goBack(); }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0) getPreferences(MODE_PRIVATE).edit().putBoolean(LOCATION_DECIDED, true).apply();
            locationPermissions.onPermissionResult();
        }
    }

    private boolean hasLocationAccess() {
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void clearIntelLocationDenial() {
        GeolocationPermissions permissions = GeolocationPermissions.getInstance();
        for (String origin : new String[]{"https://intel.ingress.com", "https://intel.ingress.com/",
                "https://intel.ingress.com:443", "https://intel.ingress.com:443/"}) permissions.clear(origin);
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override protected void onPause() {
        resumed = false;
        pollEpoch++;
        handler.removeCallbacksAndMessages(null);
        CookieManager.getInstance().flush();
        webView.onPause();
        // This spike owns the process's only WebView. pauseTimers affects every WebView in the process.
        webView.pauseTimers();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        if (webView != null) {
            webView.resumeTimers();
            webView.onResume();
            if (hasLocationAccess()) clearIntelLocationDenial(); // Recover after allowing location in Android settings.
            if (probeKey != null) pollProbe(probeKey, pageGeneration, 0);
            else maybeLoadIris(0);
            webView.evaluateJavascript("if (location.origin === 'https://intel.ingress.com'"
                    + " && window.__iitcIrisMap) window.__iitcIrisMap.invalidateSize();", null);
        }
    }

    @Override protected void onDestroy() {
        if (updateDialog != null) updateDialog.dismiss();
        updateExecutor.shutdownNow();
        resumed = false;
        locationPermissions.cancel();
        invalidateProbe();
        webView.resumeTimers(); // Do not leave the process-wide timer suspension behind after disposal.
        ((ViewGroup) webView.getParent()).removeView(webView);
        webView.stopLoading();
        webView.destroy();
        super.onDestroy();
    }
}
