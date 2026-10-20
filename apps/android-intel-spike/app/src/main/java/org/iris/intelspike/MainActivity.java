package org.iris.intelspike;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public final class MainActivity extends Activity {
    private static final String INTEL_URL = "https://intel.ingress.com/";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private TextView status;
    private ProgressBar progress;
    private Button checkButton;
    private String loadStatus;
    private String sessionStatus;
    private String lastExternalHost = "none";
    private String probeKey;
    private int pageGeneration;
    private boolean pageFailed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        loadStatus = getString(R.string.loading, NavigationPolicy.host(INTEL_URL));
        sessionStatus = getString(R.string.not_checked);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xfff5f7f8);
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
        TextView title = new TextView(this);
        title.setText(R.string.app_title);
        title.setTextSize(18);
        title.setPadding(dp(12), dp(8), dp(12), 0);
        root.addView(title);
        LinearLayout controls = new LinearLayout(this);
        controls.addView(button(R.string.open_intel, () -> webView.loadUrl(INTEL_URL)));
        controls.addView(button(R.string.reload, () -> webView.reload()));
        checkButton = button(R.string.check_session, this::checkSession);
        controls.addView(checkButton);
        controls.addView(button(R.string.diagnostics, this::showDiagnostics));
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.addView(controls);
        root.addView(scroll);
        status = new TextView(this);
        status.setPadding(dp(12), 0, dp(12), dp(8));
        status.setText(loadStatus);
        status.setAccessibilityLiveRegion(TextView.ACCESSIBILITY_LIVE_REGION_POLITE);
        root.addView(status);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        webView = new WebView(this);
        configureWebView();
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
        if (state == null || webView.restoreState(state) == null) webView.loadUrl(INTEL_URL);
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

    @SuppressLint("SetJavaScriptEnabled") // Intel requires JavaScript; no privileged native JS interface is exposed.
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setUserAgentString(LoginUserAgent.forWebView(settings.getUserAgentString()));
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags
                & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value == 100 ? android.view.View.GONE : android.view.View.VISIBLE);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (NavigationPolicy.isEmbedded(url)) return false;
                if (request.isForMainFrame()) openBrowser(url);
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                invalidateProbe();
                if (!NavigationPolicy.isEmbedded(url)) {
                    view.stopLoading();
                    pageFailed = true;
                    openBrowser(url);
                    return;
                }
                pageFailed = false;
                sessionStatus = getString(R.string.not_checked);
                loadStatus = getString(R.string.loading, NavigationPolicy.host(url));
                status.setText(loadStatus);
            }

            @Override public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                if (!pageFailed) {
                    loadStatus = getString(R.string.loaded, NavigationPolicy.host(url));
                    status.setText(loadStatus);
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

    private void failPage(String message) {
        pageFailed = true;
        invalidateProbe();
        loadStatus = message;
        status.setText(message);
        progress.setVisibility(android.view.View.GONE);
    }

    private void openBrowser(String url) {
        lastExternalHost = NavigationPolicy.host(url);
        if (NavigationPolicy.host(url).isEmpty()) {
            status.setText(R.string.blocked_navigation);
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE));
            loadStatus = getString(R.string.browser_opened);
        } catch (ActivityNotFoundException error) {
            loadStatus = getString(R.string.browser_unavailable);
        }
        status.setText(loadStatus);
    }

    private void checkSession() {
        if (!NavigationPolicy.isIntel(webView.getUrl()) || progress.getVisibility() == android.view.View.VISIBLE || pageFailed) {
            status.setText(R.string.intel_required);
            return;
        }
        invalidateProbe();
        final int generation = pageGeneration;
        final String key = "__irisSessionProbe_" + UUID.randomUUID().toString().replace("-", "");
        probeKey = key;
        checkButton.setEnabled(false);
        sessionStatus = getString(R.string.checking);
        status.setText(sessionStatus);
        try (InputStream stream = getAssets().open("session-check.js")) {
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
        if (generation != pageGeneration || !key.equals(probeKey) || !NavigationPolicy.isIntel(webView.getUrl())) return;
        if (attempt >= 60) { finishProbe(getString(R.string.check_timeout)); return; }
        webView.evaluateJavascript("window[" + JSONObject.quote(key) + "] || null", result -> {
            if (generation != pageGeneration || !key.equals(probeKey)) return;
            String message = null;
            try {
                Object value = new JSONTokener(result).nextValue();
                if (value instanceof String) message = (String) value;
            } catch (JSONException ignored) { /* A navigation can discard the JS result. */ }
            if (message != null && !message.equals(getString(R.string.checking))) {
                webView.evaluateJavascript("delete window[" + JSONObject.quote(key) + "]", null);
                finishProbe(message);
            } else {
                handler.postDelayed(() -> pollProbe(key, generation, attempt + 1), 250);
            }
        });
    }

    private void finishProbe(String message) {
        sessionStatus = message;
        status.setText(message);
        probeKey = null;
        checkButton.setEnabled(true);
    }

    private void invalidateProbe() {
        pageGeneration++;
        handler.removeCallbacksAndMessages(null);
        probeKey = null;
        if (checkButton != null) checkButton.setEnabled(true);
    }

    private void showDiagnostics() {
        PackageInfo provider = WebView.getCurrentWebViewPackage();
        String text = getString(R.string.diagnostic_text, getString(R.string.spike_version), Build.VERSION.RELEASE,
                provider == null ? "unknown" : provider.versionName, NavigationPolicy.host(webView.getUrl()),
                loadStatus, sessionStatus, lastExternalHost);
        new AlertDialog.Builder(this).setTitle(R.string.diagnostics).setMessage(text)
                .setPositiveButton(android.R.string.ok, null)
                .setNeutralButton(R.string.copy, (dialog, which) -> {
                    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.diagnostics), text));
                    Toast.makeText(this, R.string.copied, Toast.LENGTH_SHORT).show();
                }).show();
    }

    private void goBack() {
        if (webView.canGoBack()) webView.goBack();
        else finish();
    }

    // API 33+ uses the native OnBackInvokedDispatcher registered above. This is only the API 26–32 fallback.
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { goBack(); }

    @Override protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override protected void onPause() {
        CookieManager.getInstance().flush();
        webView.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override protected void onDestroy() {
        invalidateProbe();
        ((ViewGroup) webView.getParent()).removeView(webView);
        webView.stopLoading();
        webView.destroy();
        super.onDestroy();
    }
}
