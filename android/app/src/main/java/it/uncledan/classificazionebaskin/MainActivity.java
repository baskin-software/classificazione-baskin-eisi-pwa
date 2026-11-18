package it.uncledan.classificazionebaskin;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StampaPlugin.class); // stampa nativa delle schede
        super.onCreate(savedInstanceState);
    }
}
