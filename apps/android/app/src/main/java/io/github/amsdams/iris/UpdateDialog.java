package io.github.amsdams.iris;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Consumer;

final class UpdateDialog {
    private final Activity activity;
    private final Consumer<String> openBrowser;
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();
    private Future<?> updateTask;
    private AlertDialog updateDialog;

    UpdateDialog(Activity activity, Consumer<String> openBrowser) {
        this.activity = activity;
        this.openBrowser = openBrowser;
    }

    @SuppressWarnings("deprecation") // versionCode is needed on API 26–27.
    private long installedVersionCode() throws PackageManager.NameNotFoundException {
        PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    void check() {
        if (updateDialog != null) return;
        AlertDialog dialog = new AlertDialog.Builder(activity).setTitle(R.string.check_updates)
                .setMessage(R.string.updates_checking)
                .setPositiveButton(android.R.string.ok, null)
                .setNeutralButton(R.string.releases, (ignored, which) -> openBrowser.accept(ReleaseUpdate.RELEASES_URL))
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
                message = activity.getString(update.isNewerThan(installedVersionCode())
                        ? R.string.updates_available : R.string.updates_current,
                        activity.getString(R.string.spike_version), update.versionName());
            } catch (IOException | PackageManager.NameNotFoundException error) {
                message = activity.getString(R.string.updates_failed);
            }
            final String result = message;
            activity.runOnUiThread(() -> {
                if (!activity.isFinishing() && !activity.isDestroyed() && updateDialog == dialog && dialog.isShowing()) {
                    dialog.setMessage(result);
                }
            });
        });
    }

    void dispose() {
        if (updateDialog != null) updateDialog.dismiss();
        updateExecutor.shutdownNow();
    }
}
