package app.twallet.air.airasframework;

import android.app.Application;

import app.twallet.air.airasframework.airLauncher.AirLauncher;

public abstract class MTWApplicationBase extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        AirLauncher.scheduleWidgetUpdates(getApplicationContext());
    }
}
