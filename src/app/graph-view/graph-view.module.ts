import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GraphViewComponent} from './graph-view/graph-view.component';
import {D3Service} from 'd3-ng2-service';
import {GraphViewPageComponent} from './graph-view-page/graph-view-page.component';
import {
  MdButtonModule, MdDialogModule, MdFormFieldModule, MdInputModule, MdProgressSpinnerModule,
  MdRadioModule, MdSnackBarModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {GraphViewService} from './graph-view/graph-view.service';
import {FlexLayoutModule} from '@angular/flex-layout';
import {SharedModule} from '../shared/shared.module';
import {RelationPickerDialogComponent} from './relation-picker-dialog/relation-picker-dialog.component';
import {CreateQuestionDialogComponent} from './create-question-dialog/create-question-dialog.component';
import {VoteDialogComponent} from './vote-dialog/vote-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    MdButtonModule,
    MdRadioModule,
    MdDialogModule,
    MdSnackBarModule,
    MdProgressSpinnerModule,
    MdFormFieldModule,
    MdInputModule,
    FormsModule,
    FlexLayoutModule,
    SharedModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  declarations: [GraphViewComponent, GraphViewPageComponent, RelationPickerDialogComponent,
    CreateQuestionDialogComponent, VoteDialogComponent],
  bootstrap: [RelationPickerDialogComponent, CreateQuestionDialogComponent, VoteDialogComponent],
  exports: [GraphViewPageComponent],
  providers: [D3Service, GraphViewService]
})
export class GraphViewModule {
}
