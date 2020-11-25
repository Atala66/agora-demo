import { Component, OnInit, ɵConsole } from '@angular/core';
import { NgxAgoraService, Stream, AgoraClient, ClientEvent, StreamEvent } from 'ngx-agora';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'agora-demo';
  localCallId = 'agora_local';
  remoteCalls: string[] = [];

  private client: AgoraClient;
  private localStream: Stream;
  private uid: number; // genaera un uid random

  constructor(
    // tslint:disable-next-line: variable-name
    private _ngxAgoraSrv: NgxAgoraService
  ) // generate random id
  {
    this.uid = Math.floor(Math.random() * 1000);
  }

  ngOnInit(): void {
    // create  client
    this.client = this._ngxAgoraSrv.createClient({
      mode: 'rtc',
      codec: 'h264',
    });
    this.assignClientHandlers();

    // create local stream
    this.localStream = this._ngxAgoraSrv.createStream({
      streamID: this.uid,
      audio: true,
      video: true,
      screen: false
    });

    this.assignLocalStreamHandlers();
    this.initLocalStream(() => this.joinStream(uid => this.publishStream(), error => console.error(error)));

  }

  // METHOD TO HANDLE CLIENT
  private assignClientHandlers(): void {
    // on(event, callback: function): void
    this.client.on(ClientEvent.LocalStreamPublished, (evt: any) => {
      console.log('Publish stream local succesfully::', evt);
    });

    // client error handler
    this.client.on(ClientEvent.Error, (error: any) => {
      console.log('error msg::', error.reason);
      if (error.reason === 'DYNAMIC_KEY_TIMEOUT') {
        // renewChannelLkey('key(str)', 'onSuccess(f)', 'onFailure(f)')
        this.client.renewChannelKey(
          '',
          () => {
            console.log('Renew the chanel key:: SUCCESS');
          },
          () => {
            'Renew the chanel key:: ERROR';
          }
        );
      }
    });

    // client added to the stream
    this.client.on(ClientEvent.RemoteStreamAdded, (evt: any) => {
      const stream = evt.stream as Stream ;
      this.client.subscribe(stream, { audio: true, video: true }, (err: any) => {
        console.log('Subscribe stream:: FAILED', err);
      });
    });

    // client subscribed to the stream
    this.client.on(ClientEvent.RemoteStreamSubscribed, (evt: any) => {
      const stream = evt.stream as Stream;
      const id = this.getRemoteId(stream);
      if (!this.remoteCalls.length){
        this.remoteCalls.push(id);
        setTimeout(() => stream.play(id) , 1000);
      }
    });
     // client removed from the stream
    this.client.on(ClientEvent.RemoteStreamRemoved, (evt: any) => {
     const stream = evt.stream as Stream;
     if (stream) {
       stream.stop();
       this.remoteCalls = [];
       console.log(`Remote stream is removed ${stream.getId()}`);
     }
    });

// client leaves the stream
    this.client.on(ClientEvent.PeerLeave, (evt: any) => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call !== `${this.getRemoteId(stream)}`);
        console.log(`${evt.uid} left from this channel`);
      }
    });
  }


// 2:: METHODS TO HANDLE STREAM
  private assignLocalStreamHandlers(): void {
     this.localStream.on(StreamEvent.MediaAccessAllowed, () => {
       console.log('media access:: ALLOWED');
     });

     this.localStream.on(StreamEvent.MediaAccessDenied, () => {
      console.log('media access:: DENIED');
    });
  }

  private initLocalStream(onSuccess?: () => any): void {
    this.localStream.init(
      () => {
         // The user has granted access to the camera and mic.
         this.localStream.play(this.localCallId);
         if (onSuccess) {
           onSuccess();
         }
      },
      err => { alert('get user media - no device:: FAILED'), console.log('get user media:: FAILED', err)}
    );
  }


  // 3 :: METHODS TO INIT STREAM
   public joinStream(onSuccess?: (uid: number | string ) => void , onFailure?: (err: Error) => void): void {
     this.client.join(null, 'foo-bar', this.uid, onSuccess, onFailure);
  }

  public publishStream(): void {
   this.client.publish(this.localStream, err => console.log(`Publish local stream error::`, err));
  }


  // return id to subscribe to the stream
   private getRemoteId(stream: Stream): string {
     return `agora_remote-${stream.getId()}`;
   }


}
