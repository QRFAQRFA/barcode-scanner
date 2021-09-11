import { AfterViewInit, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { BrowserMultiFormatReader, MultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library/esm';

const CAPTURE_OPTIONS = {
  audio: false,
  video: {
      focusMode: 'continuous',
      facingMode: "environment",
      ///...($rootScope.deviceId && { groupId: $rootScope.deviceId }),
  },
};

const VIDEO_SIZE = {
  video: {
      width: { min: 1280, ideal: 4096 },
      height: { min: 720, ideal: 2160 }
  }
};

@Component({
  selector: 'app-root',
  template: `
        <div class="barcode-scanner">
            <div id="interactive" class="viewport">
                <video id="video" autoplay playsinline muted></video>
                <div layout-fill class="barcode-svg-container">
                    <div class="inner" ng-class="{ 'hue-hint': $ctrl.hint.isVisible}">
                        <canvas class="drawingBuffer"></canvas>
                        <!--img src="{{ iconBarcodeOverlaySvg }}"/-->
                    </div>
                </div>
            </div>
            <div class="results" *ngIf="resultList.length">
                <ul>
                    <li *ngFor="let result of resultList">{{result}}</li>
                </ul>
            </div>
            <div class="footer" [ngClass]="{'menu-open': resultList.length}">
                <div *ngIf="videoDevices.length" class="cam-container">
                    <ul class="cam-list" *ngIf="!!shouldChooseDevice">
                        <li *ngFor="let device of videoDevices" (click)="handleDeviceSelected(device.deviceId)">{{device.label}}</li>
                    </ul>
                    <button class="cam-pick" (click)="shouldChooseDevice = !shouldChooseDevice"></button>
                </div> 
                <button (click)="toggleFlashlight()"></button>
            </div>
        </div>
        `,
  styleUrls: ['./app.component.scss'],
})



/**
 * @author Aviya Amasay
 * @function BarcodeScannerDirective
 * @see angular directive definition
 * @requires @zxing/library/esm5
 */
export class AppComponent implements OnInit, OnDestroy{
    public iconBarcodeOverlaySvg='/vvdf';
    public imgSrc = '';
    private interval = 100;
    private reader: MultiFormatReader = new MultiFormatReader();
    public resultList: Array<String> = [];
    private codeReader: BrowserMultiFormatReader = new BrowserMultiFormatReader();
    private timeOfLastSuccess: any = null;
    private hint: {color: String, isVisible: Boolean};
    private mediaStream: MediaStream;
    public videoDevices: Array<any> = [];
    public shouldChooseDevice: Boolean;
    public deviceId: String;
    public flashlightOn: Boolean;

    constructor() {
        const hints = new Map();
        const {CODE_128, CODE_39, ITF, DATA_MATRIX} = BarcodeFormat;
        const formats = [CODE_128, CODE_39, ITF, DATA_MATRIX];

        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        this.reader.setHints(hints);
    }

    handleDeviceSelected(deviceId){
        this.shouldChooseDevice = false;
        this.destroy();
        this.deviceId = deviceId;
        this.requestUserMedia();
    }

    async getDeviceId() {
      return new Promise((resolve, reject) => {
        this.deviceId ? resolve(this.deviceId) :
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            this.videoDevices = devices.filter(({kind}) => kind === 'videoinput');
            if(this.videoDevices.length > 0){
              this.deviceId = this.videoDevices[0].deviceId;
              resolve(this.deviceId);
              console.log('resolve', (this.deviceId));
            } else reject(this.deviceId);
            /*for(let device of devices){
                console.log( "Found device: " + JSON.stringify( device ) );
                if(device.kind == 'videoinput' && device.label.includes('')) deviceId = device.deviceId;
            }*/
        });
      });
    }

    toggleFlashlight(){
        this.flashlightOn = !this.flashlightOn;
        const track = <any> this.mediaStream.getVideoTracks()[0];
        track.applyConstraints({
            advanced: [{torch: this.flashlightOn}]
        });
    }

    async requestUserMedia() {
        const mediaStream = this.mediaStream = await this.getUserMedia();
        //const mediaStream = await this.mediaStreamService.getMediaStream();
        const videoRef: any = document.querySelector('#interactive>#video');
        //const canvasRef = document.querySelector('#interactive canvas');
        if (mediaStream && videoRef /*&& !videoRef.srcObject*/) {
            //videoRef.srcObject = mediaStream;
            //videoRef.src = null;
            this.codeReader
                .decodeFromStream(mediaStream, 'video', (result: any) => {
                    if(result) {
                        console.log(result);
                        //this.interval = 1000;
                        if(this.resultList.includes(result.text)) {
                            this.timeOfLastSuccess < (new Date().getTime() - 1000) && this.hintBarcodeResult('red');
                            /*this.genericToastService.confirm(` פריט ${result.text} נסרק כבר `, 'סרוק שוב', `application-toast generic`, 3000).then((res: any) =>  {
                                if(res === 'ok'){
                                    this.handleDetected(result);
                                }
                            });*/
                            return;
                        }

                        this.handleDetected(result);

                        this.timeOfLastSuccess = new Date();
                        this.hintBarcodeResult('red');
                        this.resultList.push(result.text);
                    }
                })
                .catch(err => console.error(err));
        }
    };

    handleDetected(result: any) {
        let codeResult = {code: result.text};
        //this.onDetected(
        //    { result: { codeResult: codeResult} });
        console.log('detected', result.text);
    }

    ngOnInit() {
        this.requestUserMedia();
    }

    ngOnDestroy() {
        this.destroy();
    }; 
    
    destroy() {
        try{
            this.codeReader.stopContinuousDecode();
        } catch (e){}

        this.resultList = [];
        //this.mediaStreamService.stop();
        this.mediaStream && this.mediaStream.getTracks().forEach(track => {
            track.stop();
        });
        //this.$interval.cancel(this.scanInterval);
    };

    handleCanPlay() {
        let ms: any = document.querySelector('#interactive>#video');
        ms.play();
    }

    async getUserMedia(){
        const enableStream = async (isError: Boolean) => {
            try {
                let isSMA920F = !!navigator.userAgent.match(/SM-A920F/i);
                let deviceId = isSMA920F ? null : await this.getDeviceId();
                let options = {...CAPTURE_OPTIONS, ...(!isError && !isSMA920F) && VIDEO_SIZE, ...(deviceId && {video: {deviceId: deviceId}})};
                const stream = await navigator.mediaDevices.getUserMedia(options);
                console.log('stream', stream);
                return stream;
            } catch(err) {
                if(!isError) {
                    return enableStream(true)
                }
            }
        }
        return enableStream(false);
    }

    async hintBarcodeResult(color: String){
        this.hint = {color: color, isVisible: false};

        await new Promise((resolve) => {
          setTimeout(() => {
              this.hint.isVisible = true;
              resolve(true);
          }, 10);
          
          setTimeout(() => {
              this.hint.isVisible = false;
          }, 500);
        })
    }
}
