import { NgModule } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

@NgModule({
	imports: [MatButtonModule, MatIconModule, MatCheckboxModule, MatSelectModule],
	exports: [MatButtonModule, MatIconModule, MatCheckboxModule, MatSelectModule]
})
export class MaterialModule {}
