import { Directive } from '@angular/core';

@Directive({
  selector: '[barcodeScanner]',
  template: `
            <div id="interactive" class="viewport barcode-scanner">
<!--            <img style="position: absolute; z-index: 11111;" src="{{$ctrl.imgSrc}}"/>-->
                <video id="video" autoplay playsinline muted></video>
                <div layout-fill class="barcode-svg-container">
                    <div class="inner" ng-class="{ 'hue-hint': $ctrl.hint.isVisible}" data-color="{{$ctrl.hint.color}}">
                        <canvas class="drawingBuffer"></canvas>
                        <img data-ng-src="{{ $root.iconBarcodeOverlaySvg }}"/>
                    </div>
                </div>
            </div>
        `,
  styleUrls: ['./app.component.scss'],
  restrict: 'E',
  replace: true,
  scope: {
    standards: '=',
    onDetected: '&',
  },
  bindToController: true,
  controllerAs: '$ctrl'
})
export class BarcodeScannerDirective {

  constructor() { }

}
