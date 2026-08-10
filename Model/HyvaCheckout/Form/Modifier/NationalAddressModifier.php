<?php

declare(strict_types=1);

namespace Codebrainbv\PostcodeCheckout\Model\HyvaCheckout\Form\Modifier;

use Hyva\Checkout\Model\Form\EntityFormInterface;
use Hyva\Checkout\Model\Form\EntityFormModifierInterface;

if (interface_exists(EntityFormModifierInterface::class)) {
    class NationalAddressModifier implements EntityFormModifierInterface
    {
        /**
         * Renderer alias must match the `as` attribute of the block in
         * referenceBlock name="entity-form.field-renderers" (layout XML).
         */
        public function apply(EntityFormInterface $form): EntityFormInterface
        {
            return $form;
        }
    }
} else {
    class NationalAddressModifier
    {
        /**
         * Fallback implementation when Hyvä Checkout is not installed.
         */
        public function apply($form)
        {
            return $form;
        }
    }
}
