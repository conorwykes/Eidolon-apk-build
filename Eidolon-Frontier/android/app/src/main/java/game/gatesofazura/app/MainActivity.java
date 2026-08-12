package game.gatesofazura.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(6, 17, 23));
        getWindow().setNavigationBarColor(Color.rgb(6, 17, 23));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 17, 23));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new LocalAssetClient());
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        if (savedInstanceState == null) {
            webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private final class LocalAssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("https".equals(uri.getScheme()) && LOCAL_HOST.equals(uri.getHost())) {
                String path = uri.getPath();
                if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
                if (path.contains("..")) return null;
                String assetPath = "www" + path;
                try {
                    InputStream stream = getAssets().open(assetPath);
                    String mime = mimeTypeFor(assetPath);
                    return new WebResourceResponse(mime, "UTF-8", stream);
                } catch (IOException ignored) {
                    return null;
                }
            }
            return null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (LOCAL_HOST.equals(uri.getHost())) return false;
            return true;
        }
    }

    private static String mimeTypeFor(String path) {
        String guessed = URLConnection.guessContentTypeFromName(path);
        if (guessed != null) return guessed;
        String extension = MimeTypeMap.getFileExtensionFromUrl(path);
        String mapped = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        if (mapped != null) return mapped;
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('blur'));document.querySelectorAll('audio,video').forEach(function(m){m.pause();});", null);
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.resumeTimers();
            webView.onResume();
            webView.evaluateJavascript("window.dispatchEvent(new Event('focus'));", null);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
