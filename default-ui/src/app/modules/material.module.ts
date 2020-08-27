import { NgModule } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';

@NgModule({
	imports: [MatButtonModule, MatIconModule, MatCheckboxModule, MatSelectModule, MatExpansionModule, MatCardModule],
	exports: [MatButtonModule, MatIconModule, MatCheckboxModule, MatSelectModule, MatExpansionModule, MatCardModule]
})
export class MaterialModule {}
