# STS affiliate flow

STS currently uses outbound affiliate navigation. It does not collect payment, create orders, or handle delivery.

```text
product sheet
  -> /go/{productId}
  -> click recorded (when SUPABASE_SERVICE_ROLE_KEY is configured)
  -> LinkPrice API/deeplink (when LINKPRICE_API_URL and LINKPRICE_API_KEY are configured)
  -> merchant checkout
```

## Environment mapping

The LinkPrice adapter is deliberately configurable because API credentials can be issued with different endpoint and parameter names.

- `LINKPRICE_API_URL`: the approved LinkPrice deeplink/API endpoint
- `LINKPRICE_API_KEY`: server-only credential
- `LINKPRICE_METHOD`: `GET` or `POST`
- `LINKPRICE_DESTINATION_PARAM`: the parameter name for the merchant URL
- `LINKPRICE_ATTRIBUTION_PARAM`: the parameter name for STS attribution data
- `LINKPRICE_API_KEY_LOCATION`: `header` or `query`; use `header` whenever the issued contract supports it
- `LINKPRICE_API_KEY_HEADER`, `LINKPRICE_API_KEY_PREFIX`: authentication header mapping

The attribution value is deterministic and contains product, post, object, and creator keys in the form `sts_<product>_<post>_<object>_<creator>`. Keep it under the length limit required by the LinkPrice contract.

If LinkPrice is not configured or returns no usable URL, STS falls back to ADPICK when configured, then to the stored destination URL. This keeps the demo usable while making configuration failures visible in server logs.

## Supabase

Apply `supabase/migrations/0001_sts_affiliate_foundation.sql` to the target project. `affiliate_clicks` and `analytics_events` intentionally have no client insert policy; the route writes them with `SUPABASE_SERVICE_ROLE_KEY` when available.

The migration does not add PG, checkout, order, refund, shipping, or payout tables.
